export const environment = {
  production: false,
  api: {
    
    /* Backend de la pc de prueba en linux */
    /*
    baseUrl: 'http://10.50.129.101:5511',
    rutaSaa: 'http://10.50.129.101:9080/appAccesoInternoWeb/jsp/login.jsp'
    */

    /* Backend local de mi pc */    
    baseUrl: 'http://172.16.18.80:5511',
    rutaSaa: 'http://10.50.129.101:9080/appAccesoInternoWeb/jsp/login.jsp'
    

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
  mapboxAccessToken: 'pk.eyJ1IjoiY29ybWVub3MiLCJhIjoiY21oMHowMjJsMmpvYzJqcTJ0dDVuYWw5ZyJ9.IXwCQMQVg9zymZNGIyAKNQ',
  mapaMiliSegundosRefresco: 10000
};
