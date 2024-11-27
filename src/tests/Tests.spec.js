import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métrica do tipo Trend para medir a duração da chamada GET
export const getContactsDuration = new Trend('get_contacts_duration', true);

// Métrica do tipo Rate para validar o status code
export const RateContentOK = new Rate('content_OK');

export const options = {
  thresholds: {
    // Garantindo que 95% das respostas sejam abaixo de 5700ms
    get_contacts_duration: ['p(95)<5700'],
    
    // Garantindo que menos de 12% das requisições falhem
    http_req_failed: ['rate<0.12'],

    // Garantindo que mais de 95% das requisições tenham status 200
    content_OK: ['rate>0.95']
  },
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 30 },
    { duration: '20s', target: 50 },    // Primeiro minuto: 10 VUs
    { duration: '20s', target: 80 },
    { duration: '40s', target: 90 },
    { duration: '30s', target: 150 },
    { duration: '30s', target: 160 },   // Segundo minuto: 150 VUs
    { duration: '2m', target: 300 },   // Último minuto: 300 VUs
  ],
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  const baseUrl = 'https://test.k6.io/';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  // Realizando a requisição GET
  const res = http.get(`${baseUrl}`, params);

  // Registrando a duração da requisição na métrica Trend
  getContactsDuration.add(res.timings.duration);

  // Registrando o status 200 na métrica Rate
  RateContentOK.add(res.status === OK);

  // Validando se o status da requisição é 200
  check(res, {
    'GET Contacts - Status 200': () => res.status === OK
  });
}
