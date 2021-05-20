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

- we use supertest to write fake request
- for testing we'll use jest
- by convention, when we want to test a file, we put the folder \_\_test\_\_ inside of the same folder and write our tests there
- sometimes ts-jest won't detect changes you make to your test
  - in this case it can help to restart jest

### NextJS

- NextJS uses its own routing
  - in the pages folder, the file structure determines the routes
- build image and push to dockerhub

#### Kubernetes setup

- create client-depl file
- add artifact entry into skaffold.yaml
- add path to ingress-srv.yaml

#### Next config file

- this file is loaded automatically by NextJS whenever our project starts up
- we add this config file, because NextJS sometimes doesn't show our code changes
- here we say to poll our different files every 300ms
- it's still not working 100% of the time

#### Global CSS

- create \_app.js file, which works as a wrapper for our app

#### Signup component

- we created a custom hook called use-request, which we can use to handle our requests
  - hooks can only be used by components (so not inside of getInitialProps, which is a plain function)

#### ECONNREFUSED 127.0.0.1:80

- getInitialProps is executed on the server, not in the browser (unless we navigate from one page to another **while in the app**)
- in all other instances getInitialProps is executed on the server
  - hard refresh of page
  - clicking ink from different domain
  - typing URL into address bar
- when making a request inside of getInitialProps, we get an ECONNREFUSED 127.0.0.1:80
  - the reason for this is that when the server makes the request, we don't get redirected back outside of ingress, so we're still inside of the client container...nothing is running on port 80 there, so that's the reason for the error.
  - if we make this same request inside of the component, the problem goes away, since the request is made by the browser which is not inside of our k8s cluster

##### Problems with namespace

- all the different objects we create inside of kubernetes are created under a specific **Namespace**
- our objects are stored in the 'default' namespace
- ingres-nginx is inside of 'ingress-nginx' namespace
- objects inside of the same namespace can communicate with each-other by simply typing the name of the clusterIp service inside of the url
  - http://auth-srv
- cross namespace communication usesa a different pattern

  - http://NAMEOFSERVICE.NAMESPACE.svc.cluster.local
  - kubectl get namespace
  - kubectl get services (only lists services inside of default namespace)
  - kubectl get services -n ingress-nginx

- if we make a request from the browser, we don't need to worry about the domain issue, only inside of getInitialProps
- so inside of getInitialProps we have to check whether we are inside of the client or server
  - to do this, we can check if window is defined (it's defined inside of browser)

This should be the url
http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/api/users/currentuser

##### Refactor to buildClient

- we created a buildClient function which handles everything for us

#### Moving getInitialProps

- the header will also need to know whether the user is logged in or not...for that reason, the \_app component will handle the request inside of its getInitialProps function to fetch the currentUser
- so that means our index.js does not need the getInitialProps function anymore...at least for now
- but later on, we'll probably want to have it for other purposes
- as it turns out, this is a bigger problem in Next.js than you'd think at first, because once we add getInitialProps to \_app, the one in index.js is not being invoked anymore
- we solve this by manually invoking the function inside of \_app

```js
const pageProps = await appContext.Component.getInitialProps(appContext.ctx);
```

#### Issues with Custom App getInitialProps

- when we're in our pages/ directory, we define what are called **Page** Components
- but our \_app is a **Custom App** Component
- these two Components receive different arguments
- Page Component receives context === { req, res }
- Custom App Component receives context === { Component, ctx: { req, res }}

#### Signout

- when we want to sign out, the request needs to come from the browser, since the server doesn't care about cookies
- that's why the request needs to come from the component, NOT the getInitialProps function

### Code Sharing and Reuse Between Services

- a lot of the things our auth service contains is going to be used between other services aswell
- for this purpose we're going to create a Shared Library which will contain this functionality

#### How will we solve this

- we'll create an NPM package and publish it, then reuse it in our components
- we created a public organization (because its free) called tickets-tutorial
- then inside of a newly created package.json file we update the name field to : @tickets-tutorial/common
  - which means we want to publish a package called common to the tickets-tutorial organization
- inside of our common/ folder we initialize a new git repository, commit changes and run this command (you need to login first with npm login)

```sh
npm publish --access public
```

- our common library will be written as TS and published as JS
- in our tsconfig.json file we uncomment the line with declaration and outDir
- when we update our package, we need to change the version number...there are 2 ways to do this
  - manually write it out in the package.json file
  - run following command which will do this for us automatically

```sh
npm version patch
```

- read about semantic versioning for more info

#### Relocating Shared Code

- from our auth service, we moved the errors and middleware folders into the common folder
- in our common folder there's an index.ts file which is used for re-exporting everything in errors and middleware
  - we do this, so that in our services we can import stuff from the package name alone i.e. @tickets-tutorial/common

#### Mono or multi repo?

- if you go the monorepo route, you can use lerna
- in the course he uses multi-repo

### Create-Read-Write-Delete Server Setup

- copy some files from auth into tickets folder, to save some time
- build image & push to dockerhub
- create tickets-depl.yaml file
- create tickets-mongo.yaml file
- update skaffold file
- connect to MongoDB via environment variables

#### TDD Approach

- we wrote out tests in advance to be able to easily visualize what we need to implement
- for every request that comes into our tickets service, we need to call the currentUser middleware from our common package
- but the requireAuth middleware is only needed for certain requests
- for testing authentication, we do NOT want to access other services whatsover
  - so for this, we'll fake auth requests
  - when using supertest, we are expected to return an array of strings as a cookie value
