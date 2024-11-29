import * as jose from "jose";
import { v4 as uuid4 } from "uuid";
import { JsonWebSignature2020Signer } from "@gaia-x/json-web-signature-2020";
import fs from "fs/promises";
import axios from "axios";

/**
 * Generates a cryptographic key pair using the specified algorithm.
 * Exports the keys in PEM format for storage or use.
 */
export async function generateKeyPair(algorithm) {
  const { publicKey, privateKey } = await jose.generateKeyPair(algorithm);
  const privateKeyPem = await jose.exportPKCS8(privateKey);
  const publicKeyPem = await jose.exportSPKI(publicKey);
  return { publicKeyPem, privateKeyPem };
}

/**
 * Loads a private key from a file.
 * Assumes the key is stored in PEM format.
 */
export async function loadKeyPair() {
  const privateKeyPem = await fs.readFile("src/prk.ss.pem", "utf-8");
  return { privateKeyPem };
}

/**
 * Performs OIDC authentication to retrieve an access token.
 */
export async function authenticate(request: any, baseURL: string) {
  const authUrl =
    `${baseURL}/iam/realms/gaia-x/protocol/openid-connect/auth?` +
    `response_type=code&client_id=federated-catalogue&scope=openid&redirect_uri=${baseURL}/oidc/auth/callback`;

  let response = await request.get(authUrl, { maxRedirects: 0 });

  if (response.status() != 302) {
    let body = await response.text();
    const match = body.match(
      /<form id="kc-form-login".*action="([^"]+)"[^>]*>/
    );
    response = await request.post(match[1], {
      maxRedirects: 0,
      form: { username: "testuser", password: "xfsc4Ntt!", credentialId: "" },
    });
  }

  const headers = await response.headers();
  const code = new URL(headers["location"]).searchParams.get("code");

  const tokenUrl = `${baseURL}/iam/realms/gaia-x/protocol/openid-connect/token`;
  response = await request.post(tokenUrl, {
    form: {
      grant_type: "authorization_code",
      client_id: "federated-catalogue",
      client_secret: "cf|J{G3z7a,@su5j(EJzq^G$a6)4D9",
      code: code,
      redirect_uri: `${baseURL}/oidc/auth/callback`,
    },
  });

  const body = await response.json();
  return body.access_token;
}

/**
 * Signs a JSON-LD credential using the specified algorithm.
 * Allows signing with a dynamically generated or preloaded key.
 * "Credential": The JSON-LD credential to be signed.
 * "Algorithm": The algorithm used for signing (e.g., "ES256").
 * "Config": Configuration object containing signing and entity details.
 * "Entity": The entity associated with the credential.
 * returns The signed credential.
 */
export async function signJsonLd(credential, algorithm, config, entity) {
  // Scenario 1: Generate a new key pair dynamically
  const { publicKeyPem, privateKeyPem } = await generateKeyPair(algorithm);
  const pk = await jose.importPKCS8(privateKeyPem, algorithm);
  /**
  * Scenario 2: Load an existing key pair from a file.
  * Important Notes:
  - The loaded key is pre-configured for the federated catalogue.
    Using this key will result in responses being fetched from the cache.
  - This key uses a different algorithm (PS256).
    Ensure the code is updated to handle this algorithm correctly.
  - Additionally, you need to update the `verificationMethod`
    to either `did:web:compliance.lab.gaia-x.eu` or `did:web:example`.
  const { privateKeyPem } = await loadKeyPair();
  const pk = await jose.importPKCS8(privateKeyPem, "PS256");
  */

  const myDocumentLoader = async (url) => {
    const maxRetries = 5; // Number of retry attempts
    const retryDelay = 15000; // Wait time in milliseconds between retries

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(url, { maxRedirects: 5 });
        return {
          contextUrl: null,
          documentUrl: url,
          document: response.data,
        };
      } catch (e) {
        if (e.response && e.response.status === 429 && attempt < maxRetries) {
          console.warn(
            `Attempt ${attempt} failed with status 429. Retrying after ${retryDelay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          console.error(
            `Attempt ${attempt} failed with error: ${e.message || e}`
          );
          throw e; // Rethrow if it's not a 429 or retries are exhausted
        }
      }
    }
  };

  const signer = new JsonWebSignature2020Signer({
    privateKey: pk,
    privateKeyAlg: algorithm,
    verificationMethod: `${config[entity]["issuer"]}#key-0`,
    documentLoader: myDocumentLoader,
    safe: false,
  });

  const signedCredential = await signer.sign(credential[entity]);

  return signedCredential;
}

/**
 * Creates a list of participants as JSON-LD credentials.
 * Uses configuration details to populate participant data.
 * "Config": Configuration object defining participant properties.
 * reuturns A list of participants as JSON-LD objects.
 */
export async function createListParticipants(config) {
  const participants: any = [];
  for (const entity in config) {
    var participant = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/security/suites/jws-2020/v1",
        "https://registry.lab.gaia-x.eu/development/api/trusted-shape-registry/v1/shapes/jsonld/trustframework#",
      ],
      id: `${config[entity]["idPrefix"]}/${uuid4()}.json`,
      type: ["VerifiableCredential"],
      issuer: `${config[entity]["issuer"]}/${uuid4()}`,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `${config[entity]["idPrefix"]}/${uuid4()}.json`,
        "gx:legalName": config[entity]["legalName"],
        "gx:headquarterAddress": {
          "gx:countrySubdivisionCode": config[entity]["headquarterAddress"],
        },
        "gx:legalRegistrationNumber": {
          id: `${config[entity]["idPrefix"]}/${uuid4()}.json`,
        },
        "gx:legalAddress": {
          "gx:countrySubdivisionCode": config[entity]["legalAddress"],
        },
        "gx-terms-and-conditions:gaiaxTermsAndConditions": uuid4(),
        type: "gx:LegalParticipant",
      },
    };
    participants.push({ [entity]: participant });
  }
  return participants;
}

/**
 * Signs a list of JSON-LD objects with a specified algorithm.
 * Iterates through the list and signs each item.
 */
export async function signListJsonLd(list, algorithm, config) {
  const signedList: any = [];
  for (const item of list) {
    const entity = Object.keys(item)[0];
    const signedItem = await signJsonLd(item, algorithm, config, entity);
    signedList.push({ [entity]: signedItem });
  }
  return signedList;
}

/**
 * Creates a list of service offerings for the given participants.
 * Populates each service offering based on participant and service configurations.
 * returns A list of service offerings as JSON-LD objects.
 */
export async function createListServicesOffering(
  listCreatedParticipants,
  servicesConfig,
  config
) {
  const serviceOfferings: any = [];
  listCreatedParticipants.forEach((participant) => {
    const particpantName = Object.keys(participant)[0];
    const configParticipant = config[particpantName];

    if (servicesConfig[particpantName]) {
      const servicesConfigData = servicesConfig[particpantName];
      servicesConfigData.forEach((service) => {
        const serviceData = {
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://w3id.org/security/suites/jws-2020/v1",
            "https://registry.lab.gaia-x.eu/development/api/trusted-shape-registry/v1/shapes/jsonld/trustframework#",
          ],
          id: `${service["idPrefix"]}/${uuid4()}/service.json`,
          type: ["VerifiableCredential"],
          issuer: `${config[particpantName]["issuer"]}/${uuid4()}`,
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            type: "gx:ServiceOffering",
            "gx:providedBy": {
              id: participant[particpantName].verifiableCredential[0].id,
            },
            "gx:policy": service["gx:policy"],
            "gx:termsAndConditions": service["gx:termsAndConditions"],
            "gx:dataAccountExport": {
              "gx:requestType": "API",
              "gx:accessType": "digital",
              "gx:formatType": "application/json",
            },
            id: `${service["idPrefix"]}/${uuid4()}/service.json`,
          },
        };
        serviceOfferings.push({ [particpantName]: serviceData });
      });
    }
  });

  return serviceOfferings;
}
export async function updatedSelfDescription(selfDescription, algorithm) {
  // console.log("selfDescription to update", selfDescription);
  // console.log("Verifable credential to update", selfDescription.verifiableCredential);
  var vc = selfDescription.verifiableCredential[0];
  // console.log("VC to update", vc);
  var credentialSubject =
    selfDescription.verifiableCredential[0].credentialSubject;
  credentialSubject["gx:legalName"] =
    credentialSubject["gx:legalName"] + " Updated Name";
  const updateVC = {
    "@context": vc["@context"],
    id: vc.id,
    type: ["VerifiableCredential"],
    issuer: vc.issuer,
    issuanceDate: new Date().toISOString(),
    credentialSubject: credentialSubject,
  };
  // console.log("Updated VC", updateVC);

  const { publicKeyPem, privateKeyPem } = await generateKeyPair(algorithm);
  const pk = await jose.importPKCS8(privateKeyPem, algorithm);

  const signer = await new JsonWebSignature2020Signer({
    privateKey: pk,
    privateKeyAlg: algorithm,
    verificationMethod: `${vc["issuer"]}#key-0`,
  });

  const signedVC = await signer.sign(updateVC);
  // console.log("Signed credential", signedVC);
  const updateVP = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: [signedVC],
  };
  const signedVP = await signer.sign(updateVP);
  // console.log("Signed presentation", signedVP);

  return signedVP;
}
