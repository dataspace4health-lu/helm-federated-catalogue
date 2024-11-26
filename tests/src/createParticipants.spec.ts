import { test, expect } from "@playwright/test";
import {
  createListParticipants,
  signListJsonLd,
  updatedSelfDescription,
  createListServicesOffering
} from "./utils";
import fs from "fs";
import path from "path";

const customConfig = JSON.parse(
  fs.readFileSync(path.resolve("src/customConfig.json"), "utf-8")
);
const serviceOfferingConfig = JSON.parse(fs.readFileSync(path.resolve("src/serviceOfferingConfig.json"), "utf-8"));
// import config from "../playwright.config";
// const { customConfig } = config;
const algorithm = "ES256";
var VpParticipants: any = [];

let token;

let listParticipants: any = [];

test.describe("Federated Catalogue Participant Management Tests", () => {
  test("OIDC Authentication", async ({ request, baseURL }) => {
    console.log("\n--- Starting OIDC Authentication Test ---");

    const authUrl =
      `${baseURL}/iam/realms/gaia-x/protocol/openid-connect/auth?` +
      `response_type=code&` +
      `client_id=federated-catalogue&` +
      `scope=openid&` +
      `redirect_uri=${baseURL}/oidc/auth/callback`;

    console.log("Authenticating via URL:", authUrl);

    let response = await request.get(authUrl, {
      maxRedirects: 0,
    });

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

    console.log("Access Token received:", token);
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    console.log("--- OIDC Authentication Test Completed ---\n");
  });

  test("Create Participants", async ({ request, baseURL }) => {
    console.log("\n--- Starting Create Participants Test ---");

    const vcParticipants = await createListParticipants(customConfig);
    console.log("Generated VC Participants:", vcParticipants);

    const signedVcParticipants = await signListJsonLd(
      vcParticipants,
      algorithm,
      customConfig
    );
    console.log("Signed VC Participants:", signedVcParticipants);

    const VpParticipants = signedVcParticipants.map((signedVcParticipant) => {
      const entity = Object.keys(signedVcParticipant)[0];
      return {
        [entity]: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [signedVcParticipant[entity]],
        },
      };
    });

    const signedVpParticipants = await signListJsonLd(
      VpParticipants,
      algorithm,
      customConfig
    );
    console.log("Signed VP Participants:", signedVpParticipants);

    for (const signedVpParticipant of signedVpParticipants) {
      const participant = Object.values(signedVpParticipant)[0];

      console.log("Sending Participant to FC:", participant);

      const response = await request.post(`${baseURL}/catalog/participants`, {
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        data: JSON.stringify(participant),
      });

      console.log("Response for Create Participant:", await response.json());
      expect(response.ok()).toBeTruthy();
    }

    console.log("--- Create Participants Test Completed ---\n");
  });

  test("Get List of Participants", async ({ request }) => {
    console.log("\n--- Starting Get List of Participants Test ---");

    const response = await request.get(`catalog/participants`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const participants = await response.json();
    listParticipants = participants.items;

    console.log("Total Participants Retrieved:", participants.totalCount);
    expect(response.ok()).toBeTruthy();

    console.log("--- Get List of Participants Test Completed ---\n");
  });

  test("Get Created Participant", async ({ request }) => {
    console.log("\n--- Starting Get Created Participant Test ---");

    if (listParticipants.length > 0) {
      const participant = listParticipants[0];
      const fullId = participant.id;
      const extractedId = fullId.replace("did:web:dataspace4health.local/", "");

      console.log("Fetching Participant with ID:", extractedId);

      const response = await request.get(
        `catalog/participants/${extractedId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const responseBody = await response.json();
      console.log("Participant Details:", responseBody);

      expect(response.ok()).toBeTruthy();
    } else {
      console.warn("No participants found. Skipping test.");
      test.skip();
    }

    console.log("--- Get Created Participant Test Completed ---\n");
  });

  test("Update Participant", async ({ request }) => {
    console.log("\n--- Starting Update Participant Test ---");

    if (listParticipants.length > 0) {
      const participant = listParticipants[0];
      const fullId = participant.id;
      const selfDescriptionString = participant.selfDescription;

      const extractedId = fullId.replace("did:web:dataspace4health.local/", "");
      const selfDescription = JSON.parse(selfDescriptionString);

      console.log("Updating Participant with ID:", extractedId);

      const newSelfDescription = await updatedSelfDescription(
        selfDescription,
        algorithm
      );

      console.log("Updated Self Description:", newSelfDescription);

      const response = await request.put(
        `catalog/participants/${extractedId}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          data: JSON.stringify(newSelfDescription),
        }
      );

      console.log("Response for Update Participant:", await response.json());
      expect(response.ok()).toBeTruthy();
    } else {
      console.warn("No participants found. Skipping test.");
      test.skip();
    }

    console.log("--- Update Participant Test Completed ---\n");
  });
});

test.describe("Cleaning Tests", () => {
  test("Delete All Participants", async ({ request }) => {
    console.log("\n--- Starting Delete All Participants Test ---");

    if (listParticipants.length > 0) {
      for (const participant of listParticipants) {
        const fullId = participant.id;
        const extractedId = fullId.replace(
          "did:web:dataspace4health.local/",
          ""
        );

        console.log("Deleting Participant with ID:", extractedId);

        const response = await request.delete(
          `catalog/participants/${extractedId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Response for Delete Participant:", await response.json());
        expect(response.ok()).toBeTruthy();
      }
    } else {
      console.warn("No participants found. Skipping test.");
      test.skip();
    }

    console.log("--- Delete All Participants Test Completed ---\n");
  });
});


test("Create Service Offering for Participants", async ({ request, baseURL }) => {
  const vcServiceOfferings = await createListServicesOffering(VpParticipants, serviceOfferingConfig, customConfig);
  const signedVcServicesOffering = await signListJsonLd(
    vcServiceOfferings,
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
