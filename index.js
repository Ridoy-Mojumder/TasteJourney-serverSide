const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true

}))
app.use(express.json())
app.use(cookieParser())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.SET_USER}:${process.env.SET_PASS}@cluster0.23qqz48.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const logger = async (req, res, next) => {
    console.log('called: ', req.host, req.originalUrl);
    next();
}

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('value of token middleware', token)
    if (!token) {
        return res.status(401).send({ message: 'not authorized' })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        // error
        if (err) {
            console.log(err)
            return res.status(401).send({ message: 'not authorized' })
        }
        // if token is valid it will be decoded
        console.log('value in the token', decoded)
        req.user = decoded;
        next()
    })


}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const TasteJourneyCollection = client.db('TasteJourneyDB').collection('TasteJourneyAllFood');
        const GalleryCollection = client.db('TasteJourneyDB').collection('GalleryData');


        // auth related API
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log('user for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
            })
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logging Out', user)
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })






        // serverSide API
        app.get('/TasteJourneyAllFood', async (req, res) => {
            const TasteJourneyAllFood = TasteJourneyCollection.find();
            const result = await TasteJourneyAllFood.toArray();
            res.send(result)
        })

        app.post('/TasteJourneyAllFood', async (req, res) => {
            const newTasteJourneyAllFood = req.body;
            console.log(newTasteJourneyAllFood);
            const result = await TasteJourneyCollection.insertOne(newTasteJourneyAllFood);
            res.send(result);
        })

        app.get('/TasteJourneyAllFood/:id', async (req, res) => {
            const id = req.params.id;
            const result = await TasteJourneyCollection.findOne({ _id: new ObjectId(id) })
            res.send(result)
        })








        



        app.get('/GalleryData', logger, verifyToken, async (req, res) => {
            console.log('Query email:',req.query.email);
            console.log('User email:',req.user.email);
            // console.log('tok tok token', req.cookies.token)
            console.log('user in the valid token', req.user)
            let query = {};

            // if (req.query.email !== req.user.email) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }
            if (req.query?.email) {
                query = { email: req.query.email };
            }
            console.log("The query is: ",query)
            const result = await GalleryCollection.find(query).toArray();
            res.send(result);
        });





        app.post('/GalleryData', async (req, res) => {
            const newGalleryData = req.body;
            console.log(newGalleryData);
            const result = await GalleryCollection.insertOne(newGalleryData);
            res.send(result);
        })


        app.post('/purchase', (req, res) => {
            const purchaseData = req.body;
            // Logic to store purchaseData in your database
            // For example, using MongoDB
            db.collection('purchases').insertOne(purchaseData)
                .then(result => res.json({ insertedId: result.insertedId }))
                .catch(error => {
                    console.error('Error saving purchase:', error);
                    res.status(500).json({ error: 'Internal server error' });
                });
        });








        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("TasteJourney server is running")
})

app.listen(port, () => {
    console.log(`TasteJourney server is running on port: ${port}`)
})
