export const environment = {
  production: false,
  api: {
    
    /* Backend de la pc de prueba en linux */
    /*
    baseUrl: 'http://10.50.129.101:5511',
    rutaSaa: 'http://10.50.129.101:9080/appAccesoInternoWeb/jsp/login.jsp'
    */

    /* Backend AWS - ambiente de prueba */
    baseUrl: 'http://44.237.58.16:5511',
    rutaSaa: '/login'
    

    /* Backend For Frontend de mi pc (para usar el api manager WSO2) */    
    /*
    baseUrl: 'http://172.16.18.80:5510/proxy',
    rutaSaa: 'http://10.50.129.101:9080/appAccesoInternoWeb/jsp/login.jsp'    
    */

    /* Backend For Frontend de la pc de prueba (para usar el api manager WSO2) */    
    /*
    baseUrl: 'http://10.50.129.101:5510/proxy',
    rutaSaa: 'http://10.50.129.101:9080/appAccesoInternoWeb/jsp/login.jsp'    
    */
    
    /* Backend de AWS - ambiente temporal de prueba */
    /*
    baseUrl: 'http://3.150.245.61:5511',
    rutaSaa: 'http://3.150.245.61:9080/appAccesoInternoWeb/jsp/login.jsp'
    */

  },
  bffSecret: 'thaqhiri123',
  mapboxAccessToken: '${MAPBOX_ACCESS_TOKEN}',
  mapaMiliSegundosRefresco: 10000
};
