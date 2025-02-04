import { createListParticipants, signListJsonLd } from "./utils";

const algorithm = "ES256";

export async function createParticipants(request: any, baseURL: any, token: string, customConfig: any) {
    console.log("\n--- Starting Create Participants ---");

    const vcParticipants = await createListParticipants(customConfig);
    console.log("Generated VC Participants. Count:", vcParticipants.length);

    const signedVcParticipants = await signListJsonLd(vcParticipants, algorithm, customConfig);
    console.log("VC Participants signed successfully. Count:", signedVcParticipants.length);

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

    const signedVpParticipants = await signListJsonLd(VpParticipants, algorithm, customConfig);
    console.log("VP Participants signed successfully. Count:", signedVpParticipants.length);

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
            console.error("Error creating participant:", await response.text());
        }
    }

    console.log("--- Create Participants Completed ---\n");
}
