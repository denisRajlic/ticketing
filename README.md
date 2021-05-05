# Microservice Ticketing

## Steps

### Auth

- Create auth folder and init new npm project (npm init -y)
- Create tsconfig.json file with tsc --init
- create /src/index.ts
- Dockerfile
- build image

### infra/k8s

- Create infra/k8s folders
- inside create config files for k8s cluster
  - auth-depl.yaml
    - this config file creates a deployment, which creates a pod that runs our auth container
    - it also creates a service (ClusterIP by default)

### Scaffold

- the scaffold config file watches our k8s directory
- everytime we make a change to our config file, it will automatically apply to our cluster
- it makes sure anytime we change any code inside our auth directory, it syncs all the files with the appropriate running container inside of our cluster
- write out skaffold.yaml in root of project
- run skaffold dev

### Ingress-nginx (load balancer service)

- install ingress-nginx
- anytime a request comes into our cluster, it will be handled by ingress

run following command in case ingress is not connecting properly with our cluster

```sh
kubectl delete -A ValidatingWebhookConfiguration ingress-nginx-admission
```

- in /etc/hosts add <minikube ip> domain_name so that everytime we want to access the domain_name, we get redirected to the minikube ip (this is only for minikube users, Mac/Windows write localhost instead of minikube ip)
