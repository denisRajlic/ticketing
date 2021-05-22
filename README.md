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

### NATS Streaming Server - Event Bus Implementation

- docs at docs.nats.io
- **NATS** and **NATS Streaming Server** are two different things
  - in the course we refer to NATS Streaming Server as just NATS, for simplicity, but they are different things
- create nats-depl.yaml

#### How is NATS different from our Custom Event Bus

- our Custom Event Bus shared events using Axios + Express
  - it sent events to every service
  - it stored events in memory
- to communicate with NATS we'll use a client-library called node-nats-streaming
  - NATS requires us to subscribe to channels (or topics). Events are emitted to specific channels
  - NATS stores all events in memory by default, however we can customize it to store these events inside of flat files stored on a hard drive or even inside of a db MySQL/Postgres DB

#### NATS Test Project

- install @types/events so the ts errors go away
- this will be just to get familiar with NATS
- this will run outside of kubernetes
- for development purposes, we will use port forwarding with kubectl to connect to our cluster via a specific port
- some terminology:
  - the subject is the name of the channel we want to publish information to
  - the channel is something we listen to
  - subscription is something that will listen to the channel and eventually receive some data

##### Publisher

- with nats we can only share strings or raw data
  - for this purpose we'll convert all our data to JSON before sending
- when we publish, the first argument is the subject name, the second is the data, and the third is a function which get invoked after we publish the data
- the data we publish is most commonly reffered to as a message

##### Listener

- listens for messages

#### Queue Group

- inside of a channel are Queue groups which help us send events to only one subscription
- this is done in order to prevent multiple instances of a listener to receive the same event

#### Subscription Options

- setManualAckMode(true)
  - we will manually acknowledge the event, so it doesn't accidentally get lost
  - if we don't acknowledge the event manually, it waits 30s, then sends the event again

```ts
msg.ack();
```

- when we restart a client, or if a client goes down, NATS still holds on to the event for a brief period of time
- this is done because it thinks it will come back online
- to handle this we'll add some code to gracefully closedown the client

```ts
process.on('SIGINT', () => stan.close());
process.on('SIGTERM', () => stan.close());
```

- this still doesn't work 100% of the time tho..

#### Core Concurrency Issues

- probably most important video
- waiting 30s for NATS to send the event again could break our app if other events continue to flow
- we might receive the same event twice
- listener can fail to process the event
- one listener might run more quickly than another
- NATS might think a client is still alive when it is dead
- these issues still arrise even if we had a monolithic approach or a sync communication

#### Solution

- we'll add a version number to our records, so we can process events in the correct order

#### setDeliverAllAvailable & durableSubscription

- will send us all events
- this can be a problem if there's too many events
- for this reason we'll use a different option called durable subscription
- this will keep track of all the events our service has or has not processed
  - the way it works is, inside of our channel are durable subscriptions
    - each subscription has a name and it processes events
  - if, for some reason, our service is down, it won't process certain events
  - once it gets back up, NATS is going to send the events that werent processed
- we still need setDeliverAllAvailable set, so that the first time we create a subscription, we get sent the events that were emited in the past
- on any restart, setDeliverAllAvailable will be ignored, so that we don't get the events we have already processed

```ts
const options = stan
  .subscriptionOptions()
  .setManualAckMode(true)
  .setDeliverAllAvailable()
  .setDurableName('accounting-service');

const subscription = stan.subscribe(
  'ticket:created',
  'orders-service-queue-group',
  options
);
```

### Conecting to NATS in a Node JS World

- to refactor we create a listner abstract class
- then we extend this class
- create enum for subjects so we can tell ts what kind of properties our message data will have
- using generics (which can be a pain in the ass) we can handle this problem

#### Common Module

- we'll move the exact definitions of events as well as the listing of event names (subjects) into our common module
- the downside to this approach is that all our servers will need to be written in ts
- alternatives are:
  - JSON Schema
  - Protobuf
  - Apache Avro

### Managing a NATS Client

- we'll have to create a NATS singleton
- this will be done so that we don't get a circular dependency

#### Handling publish errors

- we could potentially save a ticket to the db, but fail to publish it to NATS
- what we'll do is, we'll save the event to the db
- if ANY of these fails, we'll revert all
- so we'd have separate code/process watching the Events collection and sending it off to NATS
- we won't do it in this course, since the lecturer doesn't think we would ever run into this and it adds a lot of complexity
  - in the Udemy Q&A section, someone seems to have already found a solution to this problem, so maybe implement that

#### Problems with testing

- natsWrapper is uninitialized in our testing environment
- we'll use a fancy feature inside of Jest that lets use mock (fake) imports
- the process is as follows
  - we find the file we want to fake
  - in the same directory we create a folder called \_\_mocks\_\_
  - in that folder, create a file with an identical name to the file we want to fake
  - write a fake implementation
  - tell jest to use that fake file in our test file

```ts
// We include this in our setup.ts file so that every test uses it
jest.mock('../nats-wrapper.ts');
```

- create more env variables to connect to NAST

### Cross-Service Data Replication In Action

#### Orders Service

- it will contain some replication of Ticket data
- it will contain data about the order
  - userId
  - status
  - expiresAt
  - ticketId
- setup
  - duplicate tickets service
  - install dependencies
  - build image
  - push image
  - k8s depl file
  - set up file sync options in skaffold
  - set up routing rules in ingress

#### Question about assumptions

- when building our new order route handler we are making an assumption about the structure of the ticketId

```ts
body('ticketId')
      .not()
      .isEmpty()
      .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
      .withMessage('ticketId must be provided'),
```

- this may not be a good approach, since we are making an assumption that the tickets service is going to use MongoDB
- for us it's OK since we know about the DB we're using, but it's something to keep in mind

#### What is an order?

- how will we relate an order to a ticket?
- we'll use mongoose ref/population Feature
  - inside of every order we'll have a reference to the Ticket colletion

#### Model reminder

- whenever we're getting mongoose and ts to work together, we're writing the 3 interfaces on the top of our file
- OrderAttrs describes the properties to create the order
- OrderDoc describes the properties that a saved document has
- OrderModel describes the properties the overall model it has --> the model represents the overall collection
- when writing interfaces we're using lowercase for types (string)
  - but when writing the mongoose schema and adding the type property, we're using uppercase since that is actual js code that will get executed. It has uppercase because that is the actual String constructor
- for the order status, instead of using a string, we'll use an enum to avoid typing errors

#### Mongoose Ref

- inside of our orders directory, we'll create a ticket model
- we have a similar model inside the ticket service, so we might be tempted to extract the logic into our common model and share it among other services
- but that is NOT the case, since in our new ticket model (inside orders), we'll have a different definitions about the ticket

### Understanding event flow

- a lot of services need to be aware of the ticket:created event
- we need to decide which properties to send along the event
- we may want to future-proof our interface and include as much as possible, or send just the bare minimum, so our events have only what we need
- then if we need something in the future, we add this the missing properties in and upload the common module again

#### Date

- when our order gets turned to JSON, our expiresAt will be a string
- if we rely on the Date object, then we'd get the string representing the current timezone that it is in
- we want to have consistent timestamps
- we would be providing a UTC timestamp
  - we do it with toISOString()

# My questions

- how to store env variables (probably config file) & where to keep it safe
- updates to mongodb-server definition file could break our app
- update k8s to new API (since the apiVersion will be deprecated soon)
