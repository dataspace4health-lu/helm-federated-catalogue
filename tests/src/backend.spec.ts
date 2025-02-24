import { test, expect } from '@playwright/test';

const id =  `http://gaiax.de`
const encodedId = "http%3A%2F%2Fgaiax.de"
test.describe.configure({ mode: 'serial' });

let token;

test('OIDC Authentication', async ({ request, baseURL }) => {
  const authUrl = `${process.env.IAM_PATH}/realms/${process.env.IAM_REALM}/protocol/openid-connect/auth?` +
      `response_type=code&` +
      `client_id=federated-catalogue&` +
      `scope=openid&` +
      `redirect_uri=${baseURL}/oidc/auth/callback`;
  let response = await request.get(authUrl, {
    maxRedirects: 0
  });
  
  if (response.status() != 302) {
    // Get post link from response and submit log-in request
    let body = await response.text();
    const match = body.match(/<form id="kc-form-login".*action="([^"]+)"[^>]*>/);
    response = await request.post(match[1], {
      maxRedirects: 0,
      form: {
        username: 'testuser',
        password: 'xfsc4Ntt!',
        credentialId: ''
      }
    });
  }
  
  expect(response.status()).toBe(302);

  const headers = await response.headers();
  const code = new URL(headers['location']).searchParams.get('code');
  expect(code).toBeDefined();
  expect(code).not.toBe("");

  const tokenUrl = `${process.env.IAM_PATH}/realms/${process.env.IAM_REALM}/protocol/openid-connect/token`;
  response = await request.post(tokenUrl, {
    form: {
      grant_type: 'authorization_code',
      client_id: 'federated-catalogue',
      client_secret: 'cf|J{G3z7a,@su5j(EJzq^G$a6)4D9',
      code: code,
      redirect_uri: `${baseURL}/oidc/auth/callback`
    }
  });
  
  const body = await response.json();
  expect(body.access_token).toBeDefined();
  expect(body.access_token).not.toBe("");

  token = body.access_token;
  console.log("token", token)
});

// Example test for an endpoint
test('GET API swagger', async ({ request }) => {
  const response = await request.get(`${process.env.FC_API_PATH}/swagger-ui/index.html`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  expect(response.status()).toBe(200);
  // Add further assertions based on the API response
});

test('Get List of users', async ({ request }) => {
  const usersList = await request.get(`${process.env.FC_API_PATH}/users`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  expect(usersList.ok()).toBeTruthy();
  let jsonUserList = await usersList.json()
  expect(jsonUserList).toHaveProperty('items');
  expect(Array.isArray(jsonUserList.items)).toBe(true);
});

test('Get List of participants', async ({ request }) => {
  const usersList = await request.get(`${process.env.FC_API_PATH}/participants`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  expect(usersList.ok()).toBeTruthy();

});

// test('create participants', async ({ request }) => {
  
//   const data = {
//     "@context": [
//       "https://www.w3.org/2018/credentials/v1"
//     ],
//     "@id": "http://example.edu/verifiablePresentation/self-description1",
//     "type": [
//       "VerifiablePresentation"
//     ],
//     "verifiableCredential": [
//       {
//         "@context": [
//           "https://www.w3.org/2018/credentials/v1"
//         ],
//         "@id": "https://www.example.org/legalPerson.json",
//         "@type": [
//           "VerifiableCredential"
//         ],
//         "issuer": `http://gaiax.de`,
//         "issuanceDate": "2022-10-19T18:48:09Z",
//         "credentialSubject": {
//           "@context": {
//             "gax-core": "https://w3id.org/gaia-x/core#",
//             "gax-trust-framework": "https://w3id.org/gaia-x/gax-trust-framework#",
//             "xsd": "http://www.w3.org/2001/XMLSchema#",
//             "vcard": "http://www.w3.org/2006/vcard/ns#"
//           },
//           "@id": "gax-core:Participant1",
//           "@type": "gax-trust-framework:LegalPerson",
//           "gax-trust-framework:registrationNumber": "1234",
//           "gax-trust-framework:legalAddress": {
//             "@type": "vcard:Address",
//             "vcard:country-name": "Country",
//             "vcard:locality": "Town Name",
//             "vcard:postal-code": "1234",
//             "vcard:street-address": "Street Name"
//           },
//           "gax-trust-framework:headquarterAddress": {
//             "@type": "vcard:Address",
//             "vcard:country-name": "Country",
//             "vcard:locality": "Town Name",
//             "vcard:postal-code": "1234",
//             "vcard:street-address": "Street Name"
//           },
//           "gax-trust-framework:termsAndConditions": {
//             "@type": "gax-trust-framework:TermsAndConditions",
//             "gax-trust-framework:content": {
//               "@type": "xsd:anyURI",
//               "@value": "http://example.org/tac"
//             },
//             "gax-trust-framework:hash": "1234"
//           },
//           "gax-trust-framework:subOrganisation": [
//             { "@id": "http://example.org/Provider1_1" },
//             { "@id": "http://example.org/Provider1_2" },
//             { "@id": "http://example.org/Provider1_3" },
//             { "@id": "http://example.org/Provider1_4" },
//             { "@id": "http://example.org/Provider1_5" },
//             { "@id": "http://example.org/Provider1_6" },
//             { "@id": "http://example.org/Provider1_7" }
//           ],
//           "gax-trust-framework:legalName": "Provider Name"
//         },
//         "proof": {
//           "type": "JsonWebSignature2020",
//           "created": "2022-12-02T16:05:37Z",
//           "proofPurpose": "assertionMethod",
//           "verificationMethod": "did:web:compliance.lab.gaia-x.eu",
//           "jws": "eyJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdLCJhbGciOiJQUzI1NiJ9..efXJBVbLUieloVXmK11FEmM8ke_QYhf3ObjxKHzzdujrwgToHcpVKNUYwlnUXk7-V6cuaUFwbWY1zl89u0U2Nu2UKA1kP6iBmUyg1JnWXsCtF1dpFyCZMhrYdbJxF-USa9f4RbTDcymhbRx8ZI9R4qdhDGuxDrez_Nzl2DlJfSL7hE9JBG7R8cgAq1LIfWCTN0xjVr8QvVw3R_HIilDSLv-Clf1WCSAl_7CWXDEGInBW6l7lrJ7efrjZ5GnEwbHZi0b2V0v9hjidqkMc1xl5pl9fIPk5wHsoVLdKgfJ8hUD-EtyuFJGPwk77Mqf7BVcuKR4zqmNX3s0CPCGmAmxXfGyY5ARITjgmI4gXcp1I1ax1YTCjENR8nqgS8rouO6l3xAAFgBqLdqfR1KdDiCYPFd0fTfX1T8A8yiT8o6Pg36Vewy-Jb79aWk9byxSS-xKaQGkSMbpZeErz4FKTXLYwcD8bLXcndPMtF5UlBC_A_t-_BnG5cLeZddSow-4sMs7g2qvnURIX_KRrPtuP5GRVG_cNPJagY5bzUc8lAlSNsRsivf5wJDwrRvYjn3U6FSV8sOBBGVv6UBlopl1JWjUL-9-QLmZUD1jPv9mYUWWChm2YB8dvCjkrvwRCbHFAuab2rYNag61EcYI3lcGwS3Qez-P4AKIpRfTXEpnCNIzJr2E"
//         }
//       }
//     ],
//     "proof": {
//       "type": "JsonWebSignature2020",
//       "created": "2022-12-02T16:05:37Z",
//       "proofPurpose": "assertionMethod",
//       "verificationMethod": "did:web:compliance.lab.gaia-x.eu",
//       "jws": "eyJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdLCJhbGciOiJQUzI1NiJ9..IYM1hcL55GNc115qwjdwAiHoxnx7DD4MwWcYNUDgRO2Tj6vcEtKl5Ao1f_uwpTEJBImYrd4tZL9ojDNBOTmOnxFWorsUB-iq5PMvM11xS19tl-hEhRVRY0mnFkT9er2xArWShcO6cNTnDAJuWGCtHxsU-bH3HMHCvT9u2WWKIIIJi9Axp-CGwnNaF7vddEatiXRfuZCj8RCYxKa5goCxE4vueI-OMqIF-AWU86FjTNjDXS9DJI2yYt91SFdgxQqfuG0pJF7oJv9LI-9bJjMRKBSfjPO1hqbxuPzxb4a7nywQedl1_2k2WttUQ3ZDsyju7ktkuGDDPL9p3xq6zyBsFN9shJqdS-9-tw3Nptu_EsNj1vJdNgrOZt1VdfOEGoUsDtfNg2O5XtBt4-TbE617_SgkWQhbzWAPWj47QJjcYJklzkJku7DwBicysvCiWGPOgCzFalTZPm6SL55Bz4a0UtEW8WzjtlxD_j3Mh7WW_sA3vAO9oBLRaWJhQkt0f6EG7sElETizVDB9fq0Ur5QYuHhPmCqZVr5C0VSSBz4OSE_N7DFusNqLhox13f37myfs0RiTpmwEh24EP67kyZSuUtOx004fqAWifIYiyBZj2OTdxnXy7NFiOZl80RM1cJ7WTL02-159_7E88y1LiL39uWUatFYJBCKnaMRO5uQ8BGU"
//     }
//   };
  
//   //console.log("id",id)
//   const createParticipants = await request.post(`${process.env.FC_API_PATH}/participants`, {
//     headers: {
//       'Accept': '*/*',
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${token}`
//     },
//     data:JSON.stringify(data)

//   });
//   //console.log("createParticipants",  createParticipants)
//   //console.log("createParticipants", await createParticipants.json())
//   expect(createParticipants.ok()).toBeTruthy();

// });

// test('Get Created participant ', async ({ request }) => {
//   const Participant = await request.get(`${process.env.FC_API_PATH}/participants/${encodedId}`, {
//     headers: {
//       Authorization: `Bearer ${token}`
//     }
//   });
//   //console.log("Participant",Participant)
//   expect(Participant.ok()).toBeTruthy();

// });

// test('delete Created participant ', async ({ request }) => {
//   const Participant = await request.delete(`${process.env.FC_API_PATH}/participants/${encodedId}`, {
//     headers: {
//       Authorization: `Bearer ${token}`
//     }
//   });
//   expect(Participant.ok()).toBeTruthy();

// });

