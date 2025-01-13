 // NOTE:
  // This test introduces a new mechanism for securing credentials. 
  // Instead of including a `proof` section within the Verifiable Credential (VC),
  // the credential is now enveloped in a JSON Web Token (JWT).
  // This format is not yet supported by the Federated Catalog, so the test is
  // expected to fail when attempting to register participants or add Service offering with the new format.

import { test, expect } from "@playwright/test";
import {
  createListParticipants,
  signListJsonLd,
  signListJsonLdJwt,
  createListServicesOfferingForJwtFormat,
} from "./utils";
import fs from "fs";
import path from "path";

const customConfig = JSON.parse(
  fs.readFileSync(path.resolve("src/customConfig.json"), "utf-8")
);
const serviceOfferingConfig = JSON.parse(
  fs.readFileSync(path.resolve("src/serviceOfferingConfig.json"), "utf-8")
);

const algorithm = "ES256";
var vcParticipants: any = [];
var VpParticipants: any = [];

let token;

test.describe("Federated Catalogue Participant Management Tests With JWT Signature ", () => {
    test("OIDC Authentication", async ({ request, baseURL }) => {
      console.log("\n--- Starting OIDC Authentication Test ---");

      const authUrl =
        `${baseURL}/iam/realms/gaia-x/protocol/openid-connect/auth?` +
        `response_type=code&` +
        `client_id=federated-catalogue&` +
        `scope=openid&` +
        `redirect_uri=${baseURL}/oidc/auth/callback`;

      console.log("Authenticating via OIDC...");

      let response = await request.get(authUrl, { maxRedirects: 0 });

      if (response.status() !== 302) {
        const body = await response.text();
        const match = body.match(
          /<form id="kc-form-login".*action="([^"]+)"[^>]*>/
        );
        if (!match) {
          console.error("Login form not found.");
          expect(match).toBeDefined();
        }

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
      token = body.access_token;

      console.log("Access Token received successfully.");
      expect(token).toBeDefined();
      expect(token).not.toBe("");
      console.log("--- OIDC Authentication Test Completed ---\n");
    });

    test("Create Participants", async ({ request, baseURL }) => {
      console.log("\n--- Starting Create Participants Test (With JWT Updated Format) ---");

      vcParticipants = await createListParticipants(customConfig);
      console.log("Generated VC Participants. Count:", vcParticipants.length);

      const signedVcParticipants = await signListJsonLdJwt(
        vcParticipants,
        algorithm,
        customConfig,
        "vc"
      );
      console.log(
        "VC Participants signed using JWT. Count:",
        signedVcParticipants.length
      );
      
      VpParticipants = signedVcParticipants.map((signedVcParticipant) => {
        const entity = Object.keys(signedVcParticipant)[0];
        return {
          [entity]: {
            "@context": [
              "https://www.w3.org/ns/credentials/v2",
              "https://www.w3.org/ns/credentials/examples/v2",
            ],
            type: ["VerifiablePresentation"],
            verifiableCredential: [
              {
                "@context": ["https://www.w3.org/ns/credentials/v2"],
                type: ["EnvelopedVerifiableCredential"],
                id: "data:application/vc+jwt," + signedVcParticipant[entity],
              },
            ],
          },
        };
      });

      const signedVpParticipants = await signListJsonLdJwt(
        VpParticipants,
        algorithm,
        customConfig,
        "vp"
      );
      console.log(
        "VP Participants signed using JWT. Count:",
        signedVpParticipants.length
      );

      for (const signedVpParticipant of signedVpParticipants) {
        const participant = Object.values(signedVpParticipant)[0];

        console.log("Sending Participant to FC...");

        const response = await request.post(`${baseURL}/catalog/participants`, {
          headers: {
            Accept: "*/*",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          data: JSON.stringify(participant),
        });

        console.log("Participant creation response:", response.status());
        if (!response.ok()) {
          console.log("Expected failure due to unsupported JWT format in FC.");
        }
        expect(response.ok()).toBeFalsy();
      }

      console.log("--- Create Participants Test Completed ---\n");
    });

})

test.describe("Federated Catalogue Service Offering Management Tests", () => {
    test("Create Service Offering for Participants", async ({
      request,
      baseURL,
    }) => {
      console.log("\n--- Starting Create Service Offering Test (With JWT Updated Format)---");

      console.log("Number of Participants to Use:", vcParticipants.length);
      console.log("Generating Service Offerings...");
      const vcServiceOfferings = await createListServicesOfferingForJwtFormat(
        vcParticipants,
        serviceOfferingConfig,
        customConfig
      );
      console.log("Generated Service Offerings. Count:", vcServiceOfferings.length);

      console.log("Signing Service Offerings...");
      const signedVcServicesOffering = await signListJsonLdJwt(
        vcServiceOfferings,
        algorithm,
        customConfig,
        "vc"
      );
      console.log(
        "Signed Service Offerings Count:",
        signedVcServicesOffering.length
      );

      console.log("Creating Verifiable Presentations...");
      const VpServicesOffering = signedVcServicesOffering.map(
        (signedVcServiceOffering) => {
          const entity = Object.keys(signedVcServiceOffering)[0];
          return {
            [entity]:  {
                "@context": [
                  "https://www.w3.org/ns/credentials/v2",
                  "https://www.w3.org/ns/credentials/examples/v2",
                ],
                type: ["VerifiablePresentation"],
                verifiableCredential: [
                  {
                    "@context": ["https://www.w3.org/ns/credentials/v2"],
                    type: ["EnvelopedVerifiableCredential"],
                    id: "data:application/vc+jwt," + signedVcServiceOffering[entity],
                  },
                ],
              },
          };
        }
      );

      console.log("Signing Verifiable Presentations...");
      const signedVpServicesOffering = await signListJsonLdJwt(
          VpServicesOffering,
          algorithm,
          customConfig,
          "vp"
        );
        console.log("Signed Presentations.", signedVpServicesOffering.length);
        // console.log("signedVpServicesOffering:", JSON.stringify(signedVpServicesOffering, null, 2));

      for (const signedVpServiceOffering of signedVpServicesOffering) {
        const serviceOffering = Object.values(signedVpServiceOffering)[0];
        console.log(`Sending Service Offering to Federated Catalogue.`);

        const response = await request.post(
          `${baseURL}/catalog/self-descriptions`,
          {
            headers: {
              Accept: "*/*",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            data: JSON.stringify(serviceOffering),
          }
        );

        console.log("Response for Service Offering:", response.status());
        expect(response.ok()).toBeFalsy();
      }

      console.log("--- Create Service Offering Test Completed ---\n");
    });
})