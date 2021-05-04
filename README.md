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
