import * as jose from "jose";
import { v4 as uuid4 } from "uuid";
import { JsonWebSignature2020Signer } from "@gaia-x/json-web-signature-2020";
import fs from 'fs/promises';


export async function generateKeyPair(algorithm) {
  const { publicKey, privateKey } = await jose.generateKeyPair(algorithm);
  const privateKeyPem = await jose.exportPKCS8(privateKey);
  const publicKeyPem = await jose.exportSPKI(publicKey);


  return { publicKeyPem, privateKeyPem };
}

export async function loadKeyPair() {
const privateKeyPem= await fs.readFile("src/prk.ss.pem", "utf-8");

  return {privateKeyPem} ;
}

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

export async function signJsonLd(credential, algorithm, config, entity) {
  // Generate a key pair or load an existing one.
  // Scenario 1: Generate a new key pair dynamically
  const { publicKeyPem, privateKeyPem } = await generateKeyPair(algorithm);
  const pk = await jose.importPKCS8(privateKeyPem, algorithm);

  // Scenario 2: Load an existing key pair from a file
  // Note: The loaded key here is of a different algorithm (RS256),
  // so ensure the code is updated accordingly to handle this algorithm.
  // const { privateKeyPem } = await loadKeyPair();
  // const pk = await jose.importPKCS8(privateKeyPem, "RS256");

  const signer = new JsonWebSignature2020Signer({
    privateKey: pk,
    privateKeyAlg: algorithm,
    verificationMethod: `${config[entity]["issuer"]}#key-0`,
  });

  const signedCredential = await signer.sign(credential[entity]);

  return signedCredential;
}

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
          id: `${config[entity]["idPrefix"]}/${uuid4()}.json`, //vc['lrn']['credentialSubject']['id']
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

export async function signListJsonLd(list, algorithm, config) {
  const signedList: any = [];
  for (const item of list) {
    var entity = Object.keys(item)[0];
    var signedItem = await signJsonLd(item, algorithm, config, entity);
    signedList.push({ [entity]: signedItem });
  }
  return signedList;
}
