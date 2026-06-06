import dns from 'dns';
import http from 'http';
import https from 'https';

async function resolveDns(domain: string, recordType: 'A' | 'CNAME' | 'TXT' | 'NS' | 'MX' = 'A'): Promise<any> {
  return new Promise((resolve) => {
    dns.resolve(domain, recordType, (err, addresses) => {
      if (err) {
        resolve({ error: err.message });
      } else {
        resolve(addresses);
      }
    });
  });
}

async function fetchHeaders(url: string): Promise<any> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
      });
    });
    req.on('error', (err) => {
      resolve({ error: err.message });
    });
    req.end();
  });
}

async function main() {
  console.log('=== STARTING FIREBASE HOSTING DIAGNOSTICS ===');
  console.log('Target Project ID: yala-safari-iq');
  console.log('Target Domain: www.schoolixiq.com / schoolixiq.com\n');

  console.log('--- Resolving DNS Records for schoolixiq.com ---');
  const aRecords = await resolveDns('schoolixiq.com', 'A');
  const cnameRecords = await resolveDns('schoolixiq.com', 'CNAME');
  const nsRecords = await resolveDns('schoolixiq.com', 'NS');
  const mxRecords = await resolveDns('schoolixiq.com', 'MX');
  const txtRecords = await resolveDns('schoolixiq.com', 'TXT');

  console.log('A Records for schoolixiq.com:', aRecords);
  console.log('CNAME Records for schoolixiq.com:', cnameRecords);
  console.log('NS Records for schoolixiq.com:', nsRecords);
  console.log('MX Records for schoolixiq.com:', mxRecords);
  console.log('TXT Records for schoolixiq.com:', txtRecords);

  console.log('\n--- Resolving DNS Records for www.schoolixiq.com ---');
  const wwwARecords = await resolveDns('www.schoolixiq.com', 'A');
  const wwwCnameRecords = await resolveDns('www.schoolixiq.com', 'CNAME');

  console.log('A Records for www.schoolixiq.com:', wwwARecords);
  console.log('CNAME Records for www.schoolixiq.com:', wwwCnameRecords);

  console.log('\n--- Resolving DNS Records for firebase-hosting defaults ---');
  const defaultWebAppA = await resolveDns('yala-safari-iq.web.app', 'A');
  const defaultFirebaseAppA = await resolveDns('yala-safari-iq.firebaseapp.com', 'A');
  console.log('A Records for yala-safari-iq.web.app:', defaultWebAppA);
  console.log('A Records for yala-safari-iq.firebaseapp.com:', defaultFirebaseAppA);

  console.log('\n--- Fetching HTTP Headers for domains ---');
  const targets = [
    'https://schoolixiq.com',
    'https://www.schoolixiq.com',
    'https://yala-safari-iq.web.app',
    'https://yala-safari-iq.firebaseapp.com'
  ];

  for (const url of targets) {
    console.log(`\nFetching ${url}...`);
    const result = await fetchHeaders(url);
    if (result.error) {
      console.log(`Error: ${result.error}`);
    } else {
      console.log(`Status Code: ${result.statusCode}`);
      console.log('Headers:');
      // Highlight server and hosting headers
      for (const [key, val] of Object.entries(result.headers)) {
        if ([
          'server', 'x-cache', 'via', 'x-served-by', 
          'x-firebase-hosting-uuid', 'location', 'alt-svc',
          'strict-transport-security', 'cf-ray', 'cf-cache-status'
        ].includes(key.toLowerCase()) || key.toLowerCase().startsWith('x-')) {
          console.log(`  ${key}: ${val}`);
        }
      }
    }
  }

  console.log('\n=== DIAGNOSTICS COMPLETED ===');
}

main();
