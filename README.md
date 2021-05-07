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

### Error handling

- we want consistent error handling across all our services
- create error-handler.ts file inside of our middleware/ folder
- then we want to create two separate classes (custom errors) based on the error we get (RequestValidationError and DatabaseError)

```ts
// Only because we are extending a built in class
Object.setPrototypeOf(this, RequestValidationError.prototype);
```

#### Error handler logic problem

- if we continue down this path, our error handler will become too large, it will have to handle every single error logic our app can encounter
- to combat this we add a serializeError method to every error class
- that way, the class itself handles the logic, our error handler does not need to worry about it

#### Too many error handler instances

- if we continue this way, our error handler is going to have to check for multiple instances of errors, which can become really messy
- to fix this, we will write an abstract class and check for this instance only in our error handler
- the purpose of this is to use a class as we would an interface
  - it provides a structure, which all sublcasses must follow
  - abstract classes cannot be instantiated
  - when translated to JS it creates a class, so we can use the instanceof check
