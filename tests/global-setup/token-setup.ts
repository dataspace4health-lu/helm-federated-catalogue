import { FullConfig, request, chromium } from '@playwright/test';

async function globalSetup(config: FullConfig) {

    const baseURL = config.projects[0].use.baseURL;
    const authUrl = `${baseURL}/iam/realms/gaia-x/protocol/openid-connect/auth?` +
        `response_type=code&` +
        `client_id=federated-catalogue&` +
        `scope=openid&` +
        `redirect_uri=https://dataspace4health.local/portal/login/oauth2/code/fc-client-oid`;
    let codeArray = []
    const url = '/iam/realms/gaia-x/protocol/openid-connect/token';
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ ignoreHTTPSErrors: true });
    let authorizationCode = null;
    page.on('request', async (request) => {
        const url = request.url();
        let params = new URL(url).searchParams;
        let code = params.get('code');
        if (code && code !== authorizationCode) {
            authorizationCode = params.get('code');
            codeArray.push(authorizationCode)
            console.log(`Authorization Code captured from network request: ${authorizationCode}`);
        }
    });
    await page.goto(authUrl);
    await page.getByRole('textbox', { name: 'username' }).fill('testuser');
    await page.getByRole('textbox', { name: 'password' }).fill('xfsc4Ntt!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await browser.close();
    for (let i = 0; i < codeArray.length; i++) {
        let requestContext = await request.newContext();
        let authCode = codeArray[i]
        let response = await requestContext.post(`${baseURL}${url}`, {
            ignoreHTTPSErrors: true,
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/x-www-form-urlencoded'

            },
            form: {
                'grant_type': 'authorization_code',
                'client_id': 'federated-catalogue',
                'code': authCode,
                'client_secret': 'cf|J{G3z7a,@su5j(EJzq^G$a6)4D9',
                'redirect_uri': 'https://dataspace4health.local/portal/login/oauth2/code/fc-client-oid'
            }


        },);
        const body = await response.json();
        console.log("body", body)
        if (body.access_token) {
            process.env.TOKEN = body.access_token;
        }
    }
}

export default globalSetup;