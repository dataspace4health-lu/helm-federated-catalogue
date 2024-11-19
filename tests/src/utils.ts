import * as jose from "jose";
import { v4 as uuid4 } from "uuid";

export async function loadKeyPair() {
  const { publicKey, privateKey } = await jose.generateKeyPair("PS256");
  //console.log("Generated Public Key (PEM):", await jose.exportSPKI(publicKey));
  //   console.log(
  //     "Generated Private Key (PEM):",
  //     await jose.exportPKCS8(privateKey)
  //   );
  return { publicKey, privateKey };
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
  // Generate a key pair
  const { publicKey, privateKey } = await jose.generateKeyPair(algorithm);
  const jwk = await jose.exportJWK(privateKey);
  jwk.kid = `${config[entity]["issuer"]}#key-0`;
  const pk = await jose.exportPKCS8(privateKey);

  // Convert the credential to a JSON string and then to a Buffer
  const payload = Buffer.from(JSON.stringify(credential));

  // Sign the payload
  const jws = await new jose.CompactSign(payload)
    .setProtectedHeader({
      alg: algorithm,
      kid: jwk.kid,
    })
    .sign(privateKey);

  // Add the proof to the credential
  const signedCredential = {
    ...credential[entity],
    proof: {
      type: "JsonWebSignature2020",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: jwk.kid,
      jws: jws,
    },
  };

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

export async function createListServicesOffering(
  listCreatedParticipants,
  servicesConfig,
  config
) {
  const serviceOfferings: any = [];
  //console.log("listCreatedParticipants", JSON.stringify(listCreatedParticipants, null, 2));
  listCreatedParticipants.forEach((participant) => {
    //console.log("Participant", participant);
    var particpantName = Object.keys(participant)[0];
    //console.log("particpantName", particpantName);
    var configParticipant = config[particpantName];
    //console.log("configParticipant", configParticipant);

    if (servicesConfig[particpantName]) {
      const servicesConfigData = servicesConfig[particpantName];
      servicesConfigData.forEach((service) => {
        console.log("service", service);
        var serviceData = {
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://w3id.org/security/suites/jws-2020/v1",
            "https://registry.lab.gaia-x.eu/development/api/trusted-shape-registry/v1/shapes/jsonld/trustframework#",
          ],
          id: `${service["idPrefix"]}/${uuid4()}/service.json`,
          type: "VerifiableCredential",
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
            //"gx:serviceTitle": service["gx:serviceTitle"],
            //"gx:serviceDescription": service["gx:serviceDescription"],
            //"gx:serviceType": service["gx:serviceType"],
            //"gx:serviceEndpoint": service["gx:serviceEndpoint"],
            id: `${service["idPrefix"]}/${uuid4()}/service.json`,
          },
        };
        //console.log("serviceData", JSON.stringify(serviceData, null, 2));
        serviceOfferings.push({ [particpantName]: serviceData });
      });
    }
  });
  //console.log("serviceOfferings", JSON.stringify(serviceOfferings, null, 2));

  return serviceOfferings;
}
