### What is React?

React is a declarative, efficient, and flexible JavaScript library developed at Facebook created for building user interfaces. It facilitates the creation of complex, interactive and stateful UIs from small and isolated pieces of code called components. React has taken over front-end development, It has nearly 115K [stars](https://github.com/facebook/react) on Github, and  according to [npm-stat](https://npm-stat.com/charts.html?package=react&from=2010-01-01&to=2019-12-12) it has already been download more than 190M times.

One of the biggest selling point of React is its use of the Virtual DOM, which is a “virtual” representation of the use interface kept in memory and synced with the “real” DOM by a library such as `react-dom`. This technique allows the declarative API of React: You tell React what state you want the UI to be in, and it makes sure the DOM matches that state. This abstracts out the HTML element manipulation, event handling, and manual DOM updating that you would otherwise have to use to build your app.

In this tutorial you are going to build a Github open source project bookmark (a.k.a `kudo`) JavaScript application using React in the front-end and we are also going to build a REST API written in Golang which is going to persist.

You will start by creating the back-end.

## Create a REST API with Go
### REST API Requirements
 
Your REST API exposes the `kudo` resource to support clients like your JavaScript application. 

For this tutorial, your backend will need to implement the following user stories:

- As an logged in user I want to create an github open source project bookmark
- As an logged in user I want to destroy an github open source project bookmark
- As an logged in user I want to list all bookmarked github open source projects

A normal REST API will expose endpoints so clients can `create`, `update`, `delete`, `read` and `list all` resources. So, by end of this section your back-end application will be capable to handle the following HTTP calls:

```
# For the logged in user, fetches all bookmarked github open source projects
GET /kudos

# Creates (or bookmark)  a github open source project for the logged in user
POST /kudos

# Deletes (or unbookmark) a bookmarked github open source project
DELETE /kudos/:id
```

Start creating a directory within the Golang workspace, also known as GOPATH.

```bash
mkdir -p $GOPATH/src/github.com/{YOUR_GITHUB_USERNAME}/kudo-oos
cd $GOPATH/src/github.com/{YOUR_GITHUB_USERNAME}/kudo-oos
```

Often, Golang files related to the domain of your application are placed inside the `pkg` directory. This is a convention the community has adopted which helps newcomers to this project to easily differentiate third party libraries’ files from project related files. 

### REST API Resources Representation

Your REST API will have 2 core structures, they are `Kudo` and `Repository`. `Kudo` is what many would call `model`, you will use it to represent a Github repository in memory. Whereas, `Repository` is our interface to any persistence implementation, you will use it for all interactions with your database.

Go ahead and run the following commands:

```bash
mkdir -p pkg/core
touch pkg/core/{kudo, repository}.go
```

The above commands will create the `pkg` directory with another directory within it called `core`  then, the second command will create two files: `kudo.go` and `repository.go`. Copy and paste the Kudo structure within the `kudo.go` file.

```go
package core

// Kudo represents a oos kudo.
type Kudo struct {
  UserID      string `json:"user_id" bson:"userId"`
  RepoID      string `json:"id" bson:"repoId"`
  RepoName    string `json:"full_name" bson:"repoName"`
  RepoURL     string `json:"html_url" bson:"repoUrl"`
  Language    string `json:"language" bson:"language"`
  Description string `json:"description" bson:"description"`
  Notes       string `json:"notes" bson:"notes"`
}
```

Then, copy and paste the `Repository` interface within the `repository.go` file.

```go
package core


// Repository defines the API a repository implementation should follow.
type Repository interface {
  Find(id string) (*Kudo, error)
  FindAll(selector map[string]interface{}) ([]*Kudo, error)
  Delete(kudo *Kudo) error
  Update(kudo *Kudo) error
  Create(kudo ...*Kudo) error
  Count() (int, error)
}
```
### REST API Persistence with MongoDB

Great! You have now your first two files in place. The `Repository` interface by itself does not do much. You need to create a concrete implementation of the `Repository` interface in order to persist your bookmarks. In this tutorial, you are going to persist your bookmarks in a MongoDB collection. You can either [install MongoDB following these steps](https://docs.mongodb.com/manual/installation/) in our machine or you can use docker to spin up a MongoDB container. This tutorial assumes you have docker and docker-compose installed.

`docker-compose` will manage the MongoDB container for you. 

Create `docker-compose.yml` 

```bash
touch docker-compose.yml
```

And copy and paste the following content in it:

```yaml
version: '3'
services:
  mongo:
    image: mongo
    restart: always
    ports:
     - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: mongo_user
      MONGO_INITDB_ROOT_PASSWORD: mongo_secret
````

All you have to do now to spin up a MongoDB container is:

```bash
docker-compose up
```

With MongoDB up and running you are ready to work `Repository` interface implementation for MongoDB. 

Start by creating a directory where all persistence related files should sit, a suggestion would be: `storage`.

```bash
mkdir -p pkg/storage
```

Then, create the file that will hold the MongoDB repository implementation:

```bash
touch -p pkg/storage/mongo.go
```

You will need the Golang MongoDB diver, this can be installed in different ways, I like using the dep tool to manage dependencies, so be sure to install it from here before continuing.

Then, run the command to initialize dep and install the MongoDB driver [`mgo`](https://github.com/globalsign/mgo).

```bash
dep init
dep ensure -add github.com/globalsign/mgo
```

With `mgo` properly installed, copy and paste the following content in the `pkg/storage/mongo.go` file.

```bash
package storage

import (
  "log"
  "os"

  "github.com/globalsign/mgo"
  "github.com/globalsign/mgo/bson"
  "github.com/klebervirgilio/react-crud-app-with-golang/pkg/core"
)

const (
  collectionName = "kudos"
)

func GetCollectionName() string {
  return collectionName
}

type MongoRepository struct {
  logger  *log.Logger
  session *mgo.Session
}

// Find fetches a kudo from mongo according to the query criteria provided.
func (r MongoRepository) Find(repoID string) (*core.Kudo, error) {
  session := r.session.Copy()
  defer session.Close()
  coll := session.DB("").C(collectionName)

  var kudo core.Kudo
  err := coll.Find(bson.M{"repoId": repoID, "userId": kudo.UserID}).One(&kudo)
  if err != nil {
    r.logger.Printf("error: %v\n", err)
    return nil, err
  }
  return &kudo, nil
}

// FindAll fetches all kudos from the database. YES.. ALL! be careful.
func (r MongoRepository) FindAll(selector map[string]interface{}) ([]*core.Kudo, error) {
  session := r.session.Copy()
  defer session.Close()
  coll := session.DB("").C(collectionName)

  var kudos []*core.Kudo
  err := coll.Find(selector).All(&kudos)
  if err != nil {
    r.logger.Printf("error: %v\n", err)
    return nil, err
  }
  return kudos, nil
}

// Delete deletes a kudo from mongo according to the query criteria provided.
func (r MongoRepository) Delete(kudo *core.Kudo) error {
  session := r.session.Copy()
  defer session.Close()
  coll := session.DB("").C(collectionName)

  return coll.Remove(bson.M{"repoId": kudo.RepoID, "userId": kudo.UserID})
}

// Update updates an kudo.
func (r MongoRepository) Update(kudo *core.Kudo) error {
  session := r.session.Copy()
  defer session.Close()
  coll := session.DB("").C(collectionName)

  return coll.Update(bson.M{"repoId": kudo.RepoID, "userId": kudo.UserID}, kudo)
}

// Create kudos in the database.
func (r MongoRepository) Create(kudos ...*core.Kudo) error {
  session := r.session.Copy()
  defer session.Close()
  coll := session.DB("").C(collectionName)

  for _, kudo := range kudos {
    _, err := coll.Upsert(bson.M{"repoId": kudo.RepoID, "userId": kudo.UserID}, kudo)
    if err != nil {
      return err
    }
  }

  return nil
}

// Count counts documents for a given collection
func (r MongoRepository) Count() (int, error) {
  session := r.session.Copy()
  defer session.Close()
  coll := session.DB("").C(collectionName)
  return coll.Count()
}

// NewMongoSession dials mongodb and creates a session.
func newMongoSession() (*mgo.Session, error) {
  mongoURL := os.Getenv("MONGO_URL")
  if mongoURL == "" {
    log.Fatal("MONGO_URL not provided")
  }
  return mgo.Dial(mongoURL)
}

func newMongoRepositoryLogger() *log.Logger {
  return log.New(os.Stdout, "[mongoDB] ", 0)
}

func NewMongoRepository() core.Repository {
  logger := newMongoRepositoryLogger()
  session, err := newMongoSession()
  if err != nil {
    logger.Fatalf("Could not connect to the database: %v\n", err)
  }

  return MongoRepository{
    session: session,
    logger:  logger,
  }
}
```

Implementing interface in Golang is as easy as just making sure all methods declared in the interface are implemented in the concrete implementation.

Brilliant!  You’ve just created a piece of code that handles the MongoDB persistence requirements,  `MongoRepository` exports methods like: `FindAll`, `Delete`, and, `Create`. You might recall that the user stories that you’re working on are: A logged user should able to create, delete and list all bookmarks. In order to get that done those `MongoRepository`’s methods will come handy.

You will soon implement the endpoints of your REST API. First, you need to create a service that knows how to translate the incoming request payload to our bookmark representation  `Kudo` defined in the `pkg/core/kudo`. There are two main differences between the incoming request payload, which has a Github repository implementation and your `Kudo`. The first is `Kudo` has an `UserId` which determines who owns the bookmarks and the second one is `RepoId` is an `int64` in `Kudo` whereas in the incoming request payload it is a `string`.

This service will should be placed in a directory that semantically represents its purpose. 

Run the following command to create the directory:

```bash
mkdir -p pkg/kudo
```

Then, create the service file

```bash
touch pkg/kudo/service.go
```

And finally, copy and paste the following content in it:

```go
package kudo

import (
  "strconv"

  "github.com/klebervirgilio/react-crud-app-with-golang/pkg/core"
)

type GitHubRepo struct {
  RepoID      int64  `json:"id"`
  RepoURL     string `json:"html_url"`
  RepoName    string `json:"full_name"`
  Language    string `json:"language"`
  Description string `json:"description"`
  Notes       string `json:"notes"`
}

type Service struct {
  userId string
  repo   core.Repository
}

func (s Service) GetKudos() ([]*core.Kudo, error) {
  return s.repo.FindAll(map[string]interface{}{"userId": s.userId})
}

func (s Service) CreateKudoFor(githubRepo GitHubRepo) (*core.Kudo, error) {
  kudo := s.githubRepoToKudo(githubRepo)
  err := s.repo.Create(kudo)
  if err != nil {
    return nil, err
  }
  return kudo, nil
}

func (s Service) UpdateKudoWith(githubRepo GitHubRepo) (*core.Kudo, error) {
  kudo := s.githubRepoToKudo(githubRepo)
  err := s.repo.Create(kudo)
  if err != nil {
    return nil, err
  }
  return kudo, nil
}

func (s Service) RemoveKudo(githubRepo GitHubRepo) (*core.Kudo, error) {
  kudo := s.githubRepoToKudo(githubRepo)
  err := s.repo.Delete(kudo)
  if err != nil {
    return nil, err
  }
  return kudo, nil
}

func (s Service) githubRepoToKudo(githubRepo GitHubRepo) *core.Kudo {
  return &core.Kudo{
    UserID:      s.userId,
    RepoID:      strconv.Itoa(int(githubRepo.RepoID)),
    RepoName:    githubRepo.RepoName,
    RepoURL:     githubRepo.RepoURL,
    Language:    githubRepo.Language,
    Description: githubRepo.Description,
    Notes:       githubRepo.Notes,
  }
}

func NewService(repo core.Repository, userId string) Service {
  return Service{
    repo:   repo,
    userId: userId,
  }
}
```

Notice that our constructor `NewService` receives as parameters the `repo` and the `userId` which are used in all operations in this service. That’s the beauty of interfaces, As far as Kudo service is concerned, it does not care if the `repo` is persisting the data in a MongoDB, PostgreSQL or sending the data over the network to a third party service API, all it knows is, the `repo` must implement methods like `Create`, `Delete` and `FindAll` and how they should be called. 

### Define Your Go REST API Middlewares

At this point, you’ve covered 70% of the back-end. You are ready to implement the HTTP endpoints and the JWT middleware which will secure you REST API against unauthenticated requests.

You can start by creating a directory where HTTP related files should be placed.

```bash
mkdir -p pkg/http
```

Within this directory, you will have 2 files, `handlers.go` and `middlewares.go`. Let’s start by understanding which middlewares your REST API will need. 

1 - [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) since your end goal is to create a JavaScript application that will run on web browsers, you need to make sure that web browsers are happy when a preflight is performed, you can learn more about it [here](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

2 - The requests made to your REST API are JWT authenticated, which means you need to make sure that every single request carries a valid [json web token](https://stormpath.com/blog/beginners-guide-jwts-in-java). Thankfully, Okta provides okta-jwt-verifier-golang which will take care of the validation for us. 

3 - JSON API - Your REST API must set the `Content-Type` header for every single response. This middleware will do it just once in one single place rather than having to do it in every request handler.

4 - Access Log - Basically, logs all REST API calls.

Now that know the role of each middleware, you need to write them. Start by installing the the Okta JWT verifier and CORS dependencies :

```bash
dep ensure -add github.com/okta/okta-jwt-verifier-golang
dep ensure -add github.com/rs/cors
```

Then create a file named middlewares.go.

```bash
touch pkg/http/middlewares.go
```

Then copy and paste the following content int it:

```go
package http

import (
  "context"
  "log"
  "net/http"
  "strings"

  jwtverifier "github.com/okta/okta-jwt-verifier-golang"
  "github.com/rs/cors"
)

func OktaAuth(h http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    accessToken := r.Header["Authorization"]
    jwt, err := validateAccessToken(accessToken)
    if err != nil {
      w.WriteHeader(http.StatusForbidden)
      w.Write([]byte(err.Error()))
      return
    }
    ctx := context.WithValue(r.Context(), "userId", jwt.Claims["sub"].(string))
    h.ServeHTTP(w, r.WithContext(ctx))
  })
}

func validateAccessToken(accessToken []string) (*jwtverifier.Jwt, error) {
  parts := strings.Split(accessToken[0], " ")
  jwtVerifierSetup := jwtverifier.JwtVerifier{
    Issuer:           "{DOMAIN}",
    ClaimsToValidate: map[string]string{"aud": "api://default", "cid": "{CLIENT_ID}"},
  }
  verifier := jwtVerifierSetup.New()
  return verifier.VerifyIdToken(parts[1])
}

func JSONApi(h http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    h.ServeHTTP(w, r)
  })
}

func AccsessLog(h http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    log.Printf("%s: %s", r.Method, r.RequestURI)
    h.ServeHTTP(w, r)
  })
}

func Cors(h http.Handler) http.Handler {
  corsConfig := cors.New(cors.Options{
    AllowedHeaders: []string{"Origin", "Accept", "Content-Type", "X-Requested-With", "Authorization"},
    AllowedMethods: []string{"POST", "PUT", "GET", "PATCH", "OPTIONS", "HEAD", "DELETE"},
    Debug:          true,
  })
  return corsConfig.Handler(h)
}

func UseMiddlewares(h http.Handler) http.Handler {
  h = JSONApi(h)
  h = OktaAuth(h)
  h = Cors(h)
  return AccsessLog(h)
}
```

Notice that  In the event that no valid Json Web Token is provided in the HTTP authorization header, the REST API call is aborted by `OktaAuth` middleware and an error returned to the client.

Awesome! You can now work on last piece of the back-end, the HTTP handlers. 

### Define Your Go REST API Handlers

The HTTP handlers should be easy now, since you have already done the important pieces, it’s just a matter of putting everything together. 

Create a file for the handlers:

```bash
touch pkg/http/handlers.go
```

As mentioned before, you need to provide at least the following routes:

```
GET /kudos
POST /kudos
DELETE /kudos/:id
```

Each one of the routes above represents a handler, in order to easily route incoming requests to the appropriated handler you will use the fabulous [httprouter library](https://github.com/julienschmidt/httprouter).

Run the command to Install [httprouter library](https://github.com/julienschmidt/httprouter)

```bash
dep ensure -add github.com/julienschmidt/httprouter
```

Then, copy and paste the following content in `pkg/http/handlers.go` file:

```go
package http

import (
  "encoding/json"
  "io/ioutil"
  "net/http"
  "strconv"

  "github.com/julienschmidt/httprouter"
  "github.com/klebervirgilio/react-crud-app-with-golang/pkg/core"
  "github.com/klebervirgilio/react-crud-app-with-golang/pkg/kudo"
)

type Service struct {
  repo   core.Repository
  Router http.Handler
}

func New(repo core.Repository) Service {
  service := Service{
    repo: repo,
  }

  router := httprouter.New()
  router.GET("/kudos", service.Index)
  router.POST("/kudos", service.Create)
  router.DELETE("/kudos/:id", service.Delete)
  router.PUT("/kudos/:id", service.Update)

  service.Router = UseMiddlewares(router)

  return service
}

func (s Service) Index(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
  service := kudo.NewService(s.repo, r.Context().Value("userId").(string))
  kudos, err := service.GetKudos()

  if err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    return
  }
  w.WriteHeader(http.StatusOK)
  json.NewEncoder(w).Encode(kudos)
}

func (s Service) Create(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
  service := kudo.NewService(s.repo, r.Context().Value("userId").(string))
  payload, _ := ioutil.ReadAll(r.Body)

  githubRepo := kudo.GitHubRepo{}
  json.Unmarshal(payload, &githubRepo)

  kudo, err := service.CreateKudoFor(githubRepo)

  if err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    return
  }
  w.WriteHeader(http.StatusCreated)
  json.NewEncoder(w).Encode(kudo)
}

func (s Service) Delete(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
  service := kudo.NewService(s.repo, r.Context().Value("userId").(string))

  repoID, _ := strconv.Atoi(params.ByName("id"))
  githubRepo := kudo.GitHubRepo{RepoID: int64(repoID)}

  _, err := service.RemoveKudo(githubRepo)
  if err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    return
  }
  w.WriteHeader(http.StatusOK)
}

func (s Service) Update(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
  service := kudo.NewService(s.repo, r.Context().Value("userId").(string))
  payload, _ := ioutil.ReadAll(r.Body)

  githubRepo := kudo.GitHubRepo{}
  json.Unmarshal(payload, &githubRepo)

  kudo, err := service.UpdateKudoWith(githubRepo)
  if err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    return
  }
  w.WriteHeader(http.StatusOK)
  json.NewEncoder(w).Encode(kudo)
}
```

In general, the handlers are responsible for deserializing the payload and for calling the `pkg/kudo/service.go` in order to perform actions against the database. 

### Define Your Go REST API Entry Point

Before you jump into the Client-Side React Application, you will need to create a entrypoint to start your back-end up. 

The Golang community will often place commands similar to this one in a `cmd` directory in the root of the project.

Create a folder in the root of the project called `cmd`.

```bash
mkdir cmd
```

Then create a file named main.go 

```bash
touch cmd/main.go
```

And place the following content in it:

```go
package main

import (
  "log"
  "net/http"
  "os"

  web "github.com/{YOUR_GITHUB_USERNAME}/kudo-oos/pkg/http"
  "github.com/{YOUR_GITHUB_USERNAME}/kudo-oos/pkg/storage"
)

func main() {
  httpPort := os.Getenv("PORT")

  repo := storage.NewMongoRepository()
  webService := web.New(repo)

  log.Printf("Running on port %s\n", httpPort)
  log.Fatal(http.ListenAndServe(httpPort, webService.Router))
}
```

The command above will instantiate a new `MongoRepository` and inject it as a parameter to your `WebServer` where the handlers live making sure all of them have access to it.

## Create React Client-Side App
### React App Boilerplate

To create your React Client-Side App, you will use Facebook’s awesome [`create-react-app`](https://github.com/facebook/create-react-app) tool to bypass all the webpack hassle.

Installing [`create-react-app`](https://github.com/facebook/create-react-app)  is quite simple. In this tutorial you will use [`yarn`](https://yarnpkg.com/en/docs/install) make sure you either have it installed or use the dependency manager of your preference.

To install `create-react-app`, run the command:

```bash
yarn global add create-react-app
```

You will need a directory to place your React application, go ahead and create the `web` directory within the `pkg/http` folder.

```bash
mkdir -p pkg/http/web
```

Now, create a React application:

```bash
cd pkg/http/web
create-react-app app
```

`create-react-app` might take a few minutes to generate the boilerplate application. Go to the recently created `app` directory and run `npm start`

```bash
cd app
npm start
```

Running `npm start` will start a web server listening to the port 3000. Open this url in your browser: `http://localhost:3000/` Your browser should load react and render the App.js component created automatically by `create-react-app`. 


Your goal now is to use [Material Design](https://material.io/design/) to create a simple and beautiful UI. Thankfully, the React community has created https://material-ui.com/ which basically are the [Material Design](https://material.io/design/) concepts translated to React components.

Run the following commands to install what you will need from [Material Design](https://material.io/design/).

```bash
yarn add @material-ui/core
yarn add @material-ui/icons
```

Great, now you have components like: Grid, Card, Icon, AppBar e many more ready to be imported and used. You will use them soon. Let’s talk about protected routes.

### Add Authentication to Your React App with Okta

Writing secure user auth and building login pages are easy to get wrong and can be the downfall of a new project. Okta makes it simple to implement all the user management functionality quickly and securely. Get started by signing up for a [free developer account](https://developer.okta.com/signup/) and creating an OIDC application in Okta.



Once logged in, create a new application by clicking “Add Application”.



Select the “Single-Page App” platform option.



The default application settings should be the same as those pictured.



Great! With your token OIDC application in place, you can now move forward and secure the routes that requires authentication.
### Create your Routes with react-router.

[React Router](https://reacttraining.com/react-router/) is the most used library for routing URL to React components. React Router has a collection a components that can be used to help the user to Navigate in you application. 

Your React application will have two routes:

`/`  The root route does not require the user to be logged in, it actually is the landing page of your application. An user should be able to access this page in order to log in. You will use [Okta React SDK](https://developer.okta.com/code/react) to integrate react-router with Okta's OpenID Connect API.

`/home` The Home route will render most of the React components you application will have. It should implement the following user stories.

 An Authenticated User should be able to search through the Github API the open source projects of his/her preferences
An Authenticated User should be able to bookmark open source projects that pleases him/her.
An  Authenticated User should be able to see in different tabs his/her previous bookmarked open source projects and the search results.

To Install `react-router` run the command:

```bash
yarn add react-router-dom
```

And to install the [Okta React SDK](https://developer.okta.com/code/react) run the command:

```bash
yarn add @okta/okta-react
```

Now, go head and create your Main component.

```bash
mkdir  -p app/src/Main
```

Then, within the Main directory create a file named `index.js`.

```bash
touch app/src/Main/index.js
```

And copy and paste the following content into the recently created file:

```javascript
import React, { Component } from 'react';
import { Switch, Route, } from 'react-router-dom'
import { Security, ImplicitCallback, SecureRoute } from '@okta/okta-react';

import Login from '../Login'
import Home from '../Home'

class Main extends Component {
 render() {
   return (
     <main>
       <Security
         issuer={ADD_YOUR_DOMAIN}
         client_id={ADD_YOUR_CLIENT_ID}
         redirect_uri={'http://localhost:3000/implicit/callback'}
         scope={['openid', 'profile', 'email']}>
        
         <Switch>
           <Route exact path="/" component={Login} />
           <Route path="/implicit/callback" component={ImplicitCallback} />
           <SecureRoute path="/home" component={Home} />
         </Switch>
       </Security>
     </main>
   );
 }
}

export default Main;
```

Disconsider for a minute the `Loign` and `Home` components being imported in the `Main` component. You will work on them pretty soon. Focus in the `Security`, `SecureRoute`, and `ImplicitCallback` components.

For routes to work properly in React, you need to wrap your whole application in a Router. Similarly, to allow access to authentication anywhere in the app, you need to wrap the app in a `Security` component provided by Okta. Okta also needs access to the router, so the `Security` component should be nested inside the router. 

For routes that require authentication, you will define them using the  `SecureRoute` Okta component. If an unauthenticated user tries to access `/home`, he/she will be redirect to the `/` root route.

`ImplicitCallback` component is the route/URI destination to where the user will be redirected after Okta finishes the sign in process. 

Your are now ready to create the Login component, as mentioned previously, this component will be accessible all users (not only authenticated users), the main goal of the Login component is to authenticate the user.

Inside the directory `app`, you will find a directory called `src` which stands for  source. Go ahead and create a directory named Login.

```bash
mkdir  -p app/src/Login
```

Then, within the Login directory create a file named `index.js`.

```bash
touch app/src/Login/index.js
```

And copy and paste the following content into the file:

```javascript
import React from 'react'
import Button from '@material-ui/core/Button';
import { Redirect } from 'react-router-dom'
import { withAuth } from '@okta/okta-react';

class Login extends React.Component {
 constructor(props) {
   super(props);
   this.state = { authenticated: null };
   this.checkAuthentication = this.checkAuthentication.bind(this);
   this.login = this.login.bind(this);
 }

 async checkAuthentication() {
   const authenticated = await this.props.auth.isAuthenticated();
   if (authenticated !== this.state.authenticated) {
     this.setState({ authenticated });
   }
 }

 async componentDidMount() {
   this.checkAuthentication()
 }

 async login(e) {
   this.props.auth.login('/home');
 }

 render() {
   if (this.state.authenticated) {
     return <Redirect to='/home' />
   } else {
     return (
       <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
         <Button variant="contained" color="primary" onClick={this.login}>Login with Okta</Button>
       </div>
     )
   }
 }
}

export default withAuth(Login);
```

Now try running `npm start`  and open this URL `http://localhost:3000` in your browser, you should see the page bellow


In the Login component you are using the [Okta React SDK](https://developer.okta.com/code/react) to check whether the user has already signed in or not In case the user has already signed in, the user should be redirected to the `/home` route, otherwise he/she could click in the `Login With Okta` button to then be redirect to Okta, authenticate and be redirected the the home page. As shown in the image below.



You will work in the Home component soon. But after the sign in process finishes in the Okta end, here’s the page the user should see


The Home component is composed by Material Design components like: `Tab`, `AppBar`,
`Button`, and `Icon`  as well as a few custom components you will have to create. 

You need to list all bookmarked open source projects as well as the search results. As you can see in the image above, the Home component is using a tabs to separate bookmarked open source projects from search results, the first tab is listing all the open source projects bookmarked by the user whereas the second tab will list the search results. 

You can create a component to represent an open source in both “Kudos” and “Search Results” lists, that’s the beauty of React components they are highly flexible and reusable. 

Go ahead and create a directory called “GithubRepo”

```bash
mkdir -p app/src/GithubRepo
```

Then, within the recently created directory, create a file named `index.js`

```bash
touch -p app/src/GithubRepo/index.js
```

And copy and paste the following content in it

```javascript
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import FavoriteIcon from '@material-ui/icons/Favorite';


const styles = theme => ({
  card: {
    maxWidth: 400,
  },
  media: {
    height: 0,
    paddingTop: '56.25%', // 16:9
  },
  actions: {
    display: 'flex',
  }
});

class GithubRepo extends React.Component {
  handleClick = (event) =>  {
    this.props.onKudo(this.props.repo)
  }


  render() {
    const { classes } = this.props;

    return (
      <Card className={classes.card}>
        <CardHeader
          title={this.props.repo.full_name}
        />
        <CardContent>
          <Typography component="p" style={{minHeight: '90px', overflow: 'scroll'}}>
            {this.props.repo.description}
          </Typography>
        </CardContent>
        <CardActions className={classes.actions} disableActionSpacing>
          <IconButton aria-label="Add to favorites" onClick={this.handleClick}>
            <FavoriteIcon color={this.props.isKudo ? "secondary" : "primary"} />
          </IconButton>
        </CardActions>
      </Card>
    );
  }
}

export default withStyles(styles)(GithubRepo);
```

`GithubRepo` is a quite simple component, it receives two `props`: A `repo` object which holds an reference to a Github repository and a `isKudo` boolean flag that indicates whether the `repo` has been bookmarked or not.

The next component you will need is the `SearchBar`. It will have two responsibilities: log the user out and call a react to every `keyPress` on the search text field. 


Go ahead and create a directory called “SearchBar”

```bash
mkdir -p app/src/SearchBar
```

Then, within the recently created directory, create a file named `index.js`

```bash
touch -p app/src/SearchBar/index.js
```

And copy and paste the following content in it

```javascript
import React from 'react';
import PropTypes from 'prop-types';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import InputBase from '@material-ui/core/InputBase';
import Button from '@material-ui/core/Button';
import { fade } from '@material-ui/core/styles/colorManipulator';
import { withStyles } from '@material-ui/core/styles';
import SearchIcon from '@material-ui/icons/Search';
import { withAuth } from '@okta/okta-react';

const styles = theme => ({
  root: {
    width: '100%',
  },
  MuiAppBar: {
    alignItems: 'center'
  },
  grow: {
    flexGrow: 1,
  },
  title: {
    display: 'none',
    [theme.breakpoints.up('sm')]: {
      display: 'block',
    },
  },
  search: {
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: fade(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor: fade(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing.unit * 2,
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing.unit * 3,
      width: 'auto',
    },
  },
  searchIcon: {
    width: theme.spacing.unit * 9,
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRoot: {
    color: 'inherit',
    width: '100%',
  },
  inputInput: {
    paddingTop: theme.spacing.unit,
    paddingRight: theme.spacing.unit,
    paddingBottom: theme.spacing.unit,
    paddingLeft: theme.spacing.unit * 10,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: 400,
    },
  },
  toolbar: {
    alignItems: 'center'
  }
});

class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    this.logout = this.logout.bind(this);
  }

  async logout(e) {
    e.preventDefault();
    this.props.auth.logout('/');
  }

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <AppBar position="static" style={{alignItems: 'center'}}>
          <Toolbar>
            <div className={classes.search}>
              <div className={classes.searchIcon}>
                <SearchIcon />
              </div>
              <InputBase
                placeholder="Search for your OOS project on Github + Press Enter"
                onKeyPress={this.props.onSearch}
                classes={{
                  root: classes.inputRoot,
                  input: classes.inputInput,
                }}
              />
            </div>
            <div className={classes.grow} />
            <Button onClick={this.logout} color="inherit">Logout</Button>
          </Toolbar>
        </AppBar>
      </div>
    );
  }
}

SearchBar.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(withAuth(SearchBar));
```

The `SearchBar` component receives one `prop` called `onSearch` which is the function that should be called in each `keyPress` event triggered in the search text input.

The `SearchBar` uses the `withAuth` helper provided by [Okta React SDK](https://developer.okta.com/code/react) which will inject the `auth` object in the `props` of the component. The `auth` object has a method called `logout` that will wipe out all user related data from the session exactly what you want in order to log the user out. 

Now it’s time to work on the `Home` component. One of the dependencies the component has is the [`react-swipeable-views`](https://github.com/oliviertassinari/react-swipeable-views) library which will add nice animation when the user changes tabs.

To install react-swipeable-views, run the command:

```bash
yarn add react-swipeable-views
```

Great, you will need to make HTTP calls to your Golang REST API as well as to the Github REST API. The Github HTTP client will need to have a method or function to make a request to this URL: `https://api.github.com/search/repositories?q=USER-QUERY`. You are going to use the `q` query string to pass the term the user wants to query against Github’s repositories. 

Go ahead create a file named `githubClient.js`

```bash
touch app/src/githubClient.js
```

Then, copy and paste the following content in it:

```javascript
export default {
 getJSONRepos(query) {
   return fetch('https://api.github.com/search/repositories?q=' + query).then(response => response.json());
 }
}
```

Now, you need to create a HTTP client to make HTTP calls to the Golang REST API you’ve just implemented in the first section of this tutorial. Since all the requests made to your Golang REST API requires the user to be authenticated, you will need to set the `Authorization` HTTP Header with the `acessToken` provided by Okta.

Go ahead and create a file named `apiClient.js`

```bash
touch app/src/githubClient.js
```

Then, copy and paste the following content in it:

```javascript
import axios from 'axios';

const BASE_URI = 'http://localhost:4433';

const client = axios.create({
 baseURL: BASE_URI,
 json: true
});

class APIClient {
 constructor(accessToken) {
   this.accessToken = accessToken;
 }

 createKudo(repo) {
   return this.perform('post', '/kudos', repo);
 }

 deleteKudo(repo) {
   return this.perform('delete', `/kudos/${repo.id}`);
 }

 getKudos() {
   return this.perform('get', '/kudos');
 }

 async perform (method, resource, data) {
   return client({
     method,
     url: resource,
     data,
     headers: {
       Authorization: `Bearer ${this.accessToken}`
     }
   }).then(resp => {
     return resp.data ? resp.data : [];
   })
 }
}

export default APIClient;
```

Great! Your `APIClient`’s method `perform` is adding the user’s `accessToken` to the `Authorization` HTTP header of  every request, which means, it’s authenticating every request. When the server receives these HTTP requests your Okta middleware will be able to verify the token and to extract user details from it as well. 

For the sake of simplicity, you will put everything together in the `Home` component, I mean, the `Home` component will, as soon as it gets mounted in the browser, call the Golang REST API asking for the currently logged in user’s bookmarks, it also will query the Github REST API whenever the user types something (followed by the ENTER) in the search box plus, it will be responsible for bookmarking and/or un-bookmarking a open source repository. 

Go ahead and create a directory called “Home”

```bash
mkdir -p app/src/Home
```

Then, within the recently created directory, create a file named `index.js`

```bash
touch -p app/src/Home/index.js
```

And copy and paste the following content in it

```javascript
import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import SwipeableViews from 'react-swipeable-views';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Grid from '@material-ui/core/Grid';
import { withAuth } from '@okta/okta-react';

import GithubRepo from "../GithubRepo"
import SearchBar from "../SearchBar"

import githubClient from '../githubClient'
import APIClient from '../apiClient'

const styles = theme => ({
 root: {
   flexGrow: 1,
   marginTop: 30
 },
 paper: {
   padding: theme.spacing.unit * 2,
   textAlign: 'center',
   color: theme.palette.text.secondary,
 },
});

class Home extends React.Component {
 state = {
   value: 0,
   repos: [],
   kudos: []
 };

 async componentDidMount() {
   const accessToken = await this.props.auth.getAccessToken()
   this.apiClient = new APIClient(accessToken);
   this.apiClient.getKudos().then((data) =>
     this.setState({...this.state, kudos: data})
   );
 }

 handleTabChange = (event, value) => {
   this.setState({ value });
 };

 handleTabChangeIndex = index => {
   this.setState({ value: index });
 };

 resetRepos = repos => this.setState({ ...this.state, repos })

 isKudo = repo => this.state.kudos.find(r => r.id == repo.id)
  onKudo = (repo) => {
   this.updateBackend(repo);
 }

 updateBackend = (repo) => {
   if (this.isKudo(repo)) {
     this.apiClient.deleteKudo(repo);
   } else {
     this.apiClient.createKudo(repo);
   }
   this.updateState(repo);
 }

 updateState = (repo) => {
   if (this.isKudo(repo)) {
     this.setState({
       ...this.state,
       kudos: this.state.kudos.filter( r => r.id !== repo.id )
     })
   } else {
     this.setState({
       ...this.state,
       kudos: [repo, ...this.state.kudos]
     })
   }
 }

 onSearch = (event) => {
   const target = event.target;
   if (!target.value || target.length < 3) { return }
   if (event.which !== 13) { return }

   githubClient
     .getJSONRepos(target.value)
     .then((response) => {
       target.blur();
       this.setState({ ...this.state, value: 1 });
       this.resetRepos(response.items);
     })
 }
  renderRepos = (repos) => {
   if (!repos) { return [] }
   return repos.map((repo) => {
     return (
       <Grid item xs={12} md={3} key={repo.id}>
         <GithubRepo onKudo={this.onKudo} isKudo={this.isKudo(repo)} repo={repo} />
       </Grid>
     );
   })
 }

 render() {
   return (
     <div className={styles.root}>
       <SearchBar auth={this.props.auth} onSearch={this.onSearch} />
        <Tabs
         value={this.state.value}
         onChange={this.handleTabChange}
         indicatorColor="primary"
         textColor="primary"
         fullWidth
       >
         <Tab label="Kudos" />
         <Tab label="Search" />
       </Tabs>
      
       <SwipeableViews
         axis={'x-reverse'}
         index={this.state.value}
         onChangeIndex={this.handleTabChangeIndex}
       >
         <Grid container spacing={16} style={{padding: '20px 0'}}>
           { this.renderRepos(this.state.kudos) }
         </Grid>
         <Grid container spacing={16} style={{padding: '20px 0'}}>
           { this.renderRepos(this.state.repos) }
         </Grid>
       </SwipeableViews>
     </div>
   );
 }
}

export default withStyles(styles)(withAuth(Home));
```

Now try running `npm start`  and open this URL `http://localhost:3000` in your browser, you should have a fully-functional React application running.
