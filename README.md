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

#### Async Error Handling

- to make sure our error handler works correctly with async functions, we installed a npm package called express-async-errors

### Database modeling

- install mongoose
- create auth-mongo-depl.yaml file
- in order to follow the course we had to change the mongodb version to a specific one, because the newest version implements their own @types, which override the ones used in the course

#### Mongoose

- create mongoose user model (mongoose and typescript do not work well together tho...sad fact)
- by default mongoose doesn't provide enough info to TS about the types or arguments it expects
- for this to work, when creating a new object (i.e. new User), we'll call our own custom function

```ts
const buildUser = (attrs: UserAttrs) => {
  return new User(attrs);
};
```

#### Password hashing

- using scrypt with the node built-in package 'crypto'
- the downside to scrypt is that it is callback-based, but we want to use async/await
  - for that purpose, we use promisify, to turn the callback into a promise-based implementation

### Authentication

- we'll use JWT inside of a cookie, because we're using Next.js which needs to have auth info at the time of first request
- npm i cookie-session @types/cookie-session
- in our index.ts we add this cookie session and enable it only over https
  - we don't sign (or encrypt) the cookie, because we would run into problems with decrypting in different languages
  - we also don't need to ecnrypt it since, we don't store any secret info in our cookie
- npm i jsonwebtoken @types/jsonwebtoken
- once we get the token, it is inside of a cookie
  - the actual value of the cookie is a jwt encoded with base64

#### Storing and sharing secrets

- we'll create an environment variable, which all our containers will access
- kubectl create secret generic jwt-secret --from-literal=JWT_KEY=asdf

```ts
// We add ! to tell TS we're sure this won't be undefined
process.env.JWT_KEY!;
```

#### Common Response Properties

- each of our services will use its own db, which can lead to problems
- for example MongoDB uses the field \_id instead of id as in MySQL
- what we want is a common response, regardless of the db we choose
- to do that, we pass this as the second argument to the user schema

```ts
{
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.password;
      delete ret.__v;
    },
  },
}
```

- if we were to follow the MVC (model, view, controller) way, this would be the view
  - so in general not the best approach, but will work for our purposes

#### Auth middlewares

- we add auth middlewares to check if the users are authorized

### Testing

- we're going to test our microservices in isolation
- install dependencies

```sh
npm i -D @types/jest @types/supertest jest ts-jest supertest mongodb-memory-server
```

- modify line in Dockerfile to only install dependencies not devDependencies

RUN npm install --only=prod
