import { test, expect } from "@playwright/test";
import { createListParticipants, createListServicesOffering, signListJsonLd } from "./utils";
import fs from "fs";
import path from "path";


const customConfig = JSON.parse(fs.readFileSync(path.resolve("src/customConfig.json"), "utf-8")
);
const serviceOfferingConfig = JSON.parse(fs.readFileSync(path.resolve("src/serviceOfferingConfig.json"), "utf-8"));
// import config from "../playwright.config";
// const { customConfig } = config;
const algorithm = "ES256";
var VpParticipants: any = [];

let token;

test("OIDC Authentication", async ({ request, baseURL }) => {
  const authUrl =
    `${baseURL}/iam/realms/gaia-x/protocol/openid-connect/auth?` +
    `response_type=code&` +
    `client_id=federated-catalogue&` +
    `scope=openid&` +
    `redirect_uri=${baseURL}/oidc/auth/callback`;
  let response = await request.get(authUrl, {
    maxRedirects: 0,
  });

  if (response.status() != 302) {
    // Get post link from response and submit log-in request
    let body = await response.text();
    const match = body.match(
      /<form id="kc-form-login".*action="([^"]+)"[^>]*>/
    );
    response = await request.post(match[1], {
      maxRedirects: 0,
      form: {
        username: "testuser",
        password: "xfsc4Ntt!",
        credentialId: "",
      },
    });
  }

  expect(response.status()).toBe(302);

  const headers = await response.headers();
  const code = new URL(headers["location"]).searchParams.get("code");
  expect(code).toBeDefined();
  expect(code).not.toBe("");

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
  expect(body.access_token).toBeDefined();
  expect(body.access_token).not.toBe("");

  token = body.access_token;
});

// This test is to create participants in the catalog
// I will be self signed generated key And since the 
// validation in FC of the key is active, this test will
// return failaire

test("Create Participants", async ({ request, baseURL }) => {
  const vcParticipants = await createListParticipants(customConfig);
  const signedVcParticipants = await signListJsonLd(
    vcParticipants,
    algorithm,
    customConfig
  );
  // var VpParticipants: any = [];
  signedVcParticipants.forEach((signedVcParticipant) => {
    var entity = Object.keys(signedVcParticipant)[0];
    VpParticipants.push({
      [entity]: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiablePresentation"],
        verifiableCredential: [signedVcParticipant[entity]],
      },
    });
  });
  const signedVpParticipants = await signListJsonLd(
    VpParticipants,
    algorithm,
    customConfig
  );
  console.log("signedVpParticipants", JSON.stringify(signedVpParticipants, null, 2));
  for (const signedVpParticipant of signedVpParticipants) {
    const participant = Object.values(signedVpParticipant)[0];

    // const response = await request.post(`${baseURL}/catalog/participants`, {
    //   headers: {
    //     Accept: "*/*",
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${token}`,
    //   },
    //   data: JSON.stringify(participant),
    // });

    // expect(response.ok()).toBeTruthy();
  }
});
test("Create Service Offering for Participants", async ({ request, baseURL }) => {
  const serviceOfferings = await createListServicesOffering(VpParticipants, serviceOfferingConfig, customConfig);
  const signedVcServicesOffering = await signListJsonLd(
    serviceOfferings,
    algorithm,
    customConfig
  );
  var VpServicesOffering: any = [];
  signedVcServicesOffering.forEach((signedVcServiceOffering) => {
    var entity = Object.keys(signedVcServiceOffering)[0];
    VpServicesOffering.push({
      [entity]: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiablePresentation"],
        verifiableCredential: [signedVcServiceOffering[entity]],
      },
    });
  });

  const signedVpServicesOffering = await signListJsonLd(
    VpServicesOffering,
    algorithm,
    customConfig
  );
  console.log("signedVpServicesOffering", JSON.stringify(signedVpServicesOffering, null, 2));

  for (const signedVpServiceOffering of signedVpServicesOffering) {
    const serviceOffering = Object.values(signedVpServiceOffering)[0];
    const response = await request.post(`${baseURL}/catalog/self-descriptions`, {
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: JSON.stringify(serviceOffering),
    });

    expect(response.ok()).toBeFalsy();
  }
  
});
