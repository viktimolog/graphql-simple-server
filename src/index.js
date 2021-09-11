const {ApolloServer, gql} = require('apollo-server-express');
const express = require('express');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const USER_SECRET = 'USER_SECRET';

const app = express();

const sessionOptions = {
    key: 'token',
    secret: USER_SECRET,
    resave: false,
    rolling: true,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 15 * 60 * 1000,
    },
};

const corsOptions = {
    origin: `http://localhost:3000`,
    credentials: true,
};

app.use(session(sessionOptions));
app.use(cors(corsOptions));

app.use((req, res, next) => {
    // checks for user in cookies and adds userId to the requests
    // console.log(req.session.token);

    const {token} = req.session;
    if (token) {
        const {username} = jwt.verify(token, USER_SECRET);
        req.username = username;
    }

    next();
});

const typeDefs = gql`
    type User {
        name: String!
        email: String!
        password: String
    }
    type Query {
        users: [User]!
    }
    type Mutation {
        signUp(name: String!, email: String!, password: String!): User!
        login(name: String!, password: String!): User!
    }
`;

const db = [
    {
        name: 'Oliver',
        email: 'oliver@lectrum.io',
        password: 'oliverPassword',
    },
];

const resolvers = {
    Query: {
        users: (_, __, ctx) => {
            if (ctx.req.username) {
                return db;
            } else {
                return db.map(({name, email}) => ({
                    name,
                    email,
                    password: null
                }))
            }
        },
    },
    Mutation: {
        signUp: (_, user) => {
            db.push(user);

            return user;
        },
        login: (_, {name, password}, ctx) => {
            const user = db.find((currentUser) => currentUser.name === name);

            if (!user) {
                throw new Error(`No such user found with this name ${name}`);
            }
            const isUserValid = user.password === password;

            if (!isUserValid) {
                throw new Error(`password is not valid!`);
            }

            const token = jwt.sign({username: name}, USER_SECRET);
            ctx.req.session.token = token;

            return user;
        },
    },
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({req, res}) => {
        return {req, res};
    },
    playground: {
        settings: {
            "request.credentials": "include"
        }
    }
});

server.applyMiddleware({
    app,
    path: '/',
    cors: false,
});

app.listen({port: 4000}, () =>
    console.log(
        `🚀 Server ready at http://localhost:4000${server.graphqlPath}`,
    ),
);
