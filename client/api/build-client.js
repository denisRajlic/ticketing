import axios from 'axios';

const buildClient = ({ req }) => {
  // We are on the server
  if (typeof window === 'undefined')
    return axios.create({
      baseURL:
        'http://ingress-nginx-controller.ingress-nginx.svc.cluster.local',
      headers: req.headers,
    });

  // We are on the browser
  return axios.create({ baseURL: '/' });
};

export default buildClient;
