import { FullConfig, request } from '@playwright/test';

async function globalSetup(config: FullConfig) {
    const baseURL = config.projects[0].use.baseURL;
    const url = '/iam/realms/gaia-x/protocol/openid-connect/token';
    const requestContext = await request.newContext();
    const response = await requestContext.post(`${baseURL}${url}`, {
        ignoreHTTPSErrors:true,
        headers: {
            'Accept': '*/*',
            'Content-Type': 'application/x-www-form-urlencoded'
            //'Authorization': `Basic ${Buffer.from(`testuser:xfsc4Ntt!`).toString('base64')}`
        },
        form: {
            'grant_type': 'password',
            'client_id': 'federated-catalogue',
            'username': 'testuser',
            'password': 'xfsc4Ntt!',
            'client_secret': 'cf|J{G3z7a,@su5j(EJzq^G$a6)4D9'
        }


    },);
    const body = await response.json();
    console.log("body", body)
    process.env.TOKEN = body.access_token;
}

export default globalSetup;