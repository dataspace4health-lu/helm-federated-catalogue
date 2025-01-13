import { test, expect } from "@playwright/test";
import {
  createListParticipants,
  signListJsonLd,
  updatedSelfDescription,
  createListServicesOffering,
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
var VpParticipants: any = [];

let token;

let listParticipants: any = [];
let listServicesOffering: any = [];

test.describe("Federated Catalogue Participant Management Tests", () => {
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
    console.log("\n--- Starting Create Participants Test ---");

    const vcParticipants = await createListParticipants(customConfig);
    console.log("Generated VC Participants. Count:", vcParticipants.length);

    const signedVcParticipants = await signListJsonLd(
      vcParticipants,
      algorithm,
      customConfig
    );
    console.log(
      "VC Participants signed successfully. Count:",
      signedVcParticipants.length
    );

    VpParticipants = signedVcParticipants.map((signedVcParticipant) => {
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
    console.log(
      "VP Participants signed successfully. Count:",
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

    console.log(
      "Participants retrieved successfully. Count:",
      participants.totalCount
    );
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
      console.log("Participant fetched successfully.");
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

      console.log("Self-description updated.");

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

      console.log("Participant update response:", response.status());
      expect(response.ok()).toBeTruthy();
    } else {
      console.warn("No participants found. Skipping test.");
      test.skip();
    }

    console.log("--- Update Participant Test Completed ---\n");
  });
});


test.describe("Federated Catalogue Service Offering Management Tests", () => {
  test("Create Service Offering for Participants", async ({
    request,
    baseURL,
  }) => {
    console.log("\n--- Starting Create Service Offering Test ---");

    console.log(`Number of Participants to Use: ${VpParticipants.length}`);
    console.log("Generating Service Offerings...");
    const vcServiceOfferings = await createListServicesOffering(
      VpParticipants,
      serviceOfferingConfig,
      customConfig
    );
    console.log(`Generated ${vcServiceOfferings.length} Service Offerings.`);

    console.log("Signing Service Offerings...");
    const signedVcServicesOffering = await signListJsonLd(
      vcServiceOfferings,
      algorithm,
      customConfig
    );
    console.log(`Signed ${signedVcServicesOffering.length} Service Offerings.`);

    console.log("Creating Verifiable Presentations...");
    const VpServicesOffering = signedVcServicesOffering.map(
      (signedVcServiceOffering) => {
        const entity = Object.keys(signedVcServiceOffering)[0];
        return {
          [entity]: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiablePresentation"],
            verifiableCredential: [signedVcServiceOffering[entity]],
          },
        };
      }
    );

    console.log("Signing Verifiable Presentations...");
    const signedVpServicesOffering = await signListJsonLd(
      VpServicesOffering,
      algorithm,
      customConfig
    );
    console.log(`Signed ${signedVpServicesOffering.length} Presentations.`);

    for (const signedVpServiceOffering of signedVpServicesOffering) {
      const serviceOffering = Object.values(signedVpServiceOffering)[0];
      console.log(
        `Sending Service Offering to Federated Catalogue.`
      );

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

      console.log(
        `Response for Service Offering: ${response.status()}`
      );
      expect(response.ok()).toBeTruthy();
    }

    console.log("--- Create Service Offering Test Completed ---\n");
  });

  test("Get List Services Offering", async ({ request, baseURL }) => {
    console.log("\n--- Starting Get Self-Descriptions Test ---");

    const url = `${baseURL}/catalog/self-descriptions?statuses=REVOKED,ACTIVE,DEPRECATED`;
    const response = await request.get(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.ok()).toBeTruthy();

    const selfDescriptions = await response.json();
    const totalElements = selfDescriptions.items?.length || 0;
    listServicesOffering = selfDescriptions.items;
    
    console.log(`Retrieved ${totalElements} Self-Descriptions.`);
    console.log("listServicesOffering", JSON.stringify(listServicesOffering, null, 2));

    console.log("--- Get Self-Descriptions Test Completed ---\n");
  });

  test("Get Created Service Offering", async ({ request }) => {
    console.log("\n--- Starting Get Created Service Offering Test ---");

    if (listServicesOffering.length > 0) {
      const serviceOffering = listServicesOffering[0];
      const hash = serviceOffering.meta.sdHash;

      console.log(`Fetching Service Offering with Hash: ${hash}`);

      const response = await request.get(`catalog/self-descriptions/${hash}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseBody = await response.json();
      console.log(
        `Retrieved Service Offering Details: ${JSON.stringify(
          { hash, status: responseBody.status },
          null,
          2
        )}`
      );

      expect(response.ok()).toBeTruthy();
    } else {
      console.warn("No service offerings found. Skipping test.");
      test.skip();
    }

    console.log("--- Get Created Service Offering Test Completed ---\n");
  });
});


test.describe("Cleaning Tests", () => {
  test("Delete All Participants", async ({ request }) => {
    console.log("\n--- Starting Delete All Participants Test ---");

    if (listParticipants.length > 0) {
      console.log(`Found ${listParticipants.length} Participants to Delete.`);
      for (const participant of listParticipants) {
        const extractedId = participant.id.replace(
          "did:web:dataspace4health.local/",
          ""
        );

        console.log(`Deleting Participant with ID: ${extractedId}`);
        const response = await request.delete(
          `catalog/participants/${extractedId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log(
          `Delete Participant Response Status: ${response.status()}`
        );
        expect(response.ok()).toBeTruthy();
      }
    } else {
      console.warn("No participants found. Skipping test.");
      test.skip();
    }

    console.log("--- Delete All Participants Test Completed ---\n");
  });

  test("Delete All Service Offerings", async ({ request, baseURL }) => {
    console.log("\n--- Starting Delete All Service Offerings Test ---");

    const url = `${baseURL}/catalog/self-descriptions?statuses=REVOKED,ACTIVE,DEPRECATED`;
    console.log("Fetching all service offerings...");
    const getResponse = await request.get(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    expect(getResponse.ok()).toBeTruthy();

    const selfDescriptions = await getResponse.json();
    const serviceOfferings = selfDescriptions.items || [];
    console.log(`Found ${serviceOfferings.length} Service Offerings.`);

    if (serviceOfferings.length > 0) {
      for (const serviceOffering of serviceOfferings) {
        const hash = serviceOffering.meta.sdHash;

        console.log(`Deleting Service Offering with Hash: ${hash}`);
        const deleteResponse = await request.delete(
          `catalog/self-descriptions/${hash}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log(
          `Delete Service Offering Response Status: ${deleteResponse.status()}`
        );
        expect(deleteResponse.ok()).toBeTruthy(); // Ensure delete was successful
      }
    } else {
      console.warn("No service offerings found. Skipping test.");
      test.skip();
    }

    console.log("--- Delete All Service Offerings Test Completed ---\n");
  });
});
