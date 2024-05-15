const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5173',
        'https://tastejourney-45991.web.app',
        'https://tastejourney-45991.firebaseapp.com'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.SET_USER}:${process.env.SET_PASS}@cluster0.23qqz48.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;





const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const logger = (req, res, next) => {
    console.log('Called: ', req.host, req.originalUrl);
    next();
};

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    console.log('Value from token middleware', token);
    if (!token) {
        console.log('No token provided');
        return res.status(401).send({ message: 'Not authorized' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log('Token verification failed', err);
            return res.status(401).send({ message: 'Not authorized' });
        }
        console.log('Decoded token:', decoded);
        req.user = decoded;
        next();
    });
};


const cookieOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
}

async function run() {
    try {
        // await client.connect();
        const TasteJourneyCollection = client.db('TasteJourneyDB').collection('TasteJourneyAllFood');
        const GalleryCollection = client.db('TasteJourneyDB').collection('GalleryData');
        const TeamMemberCollection = client.db('TasteJourneyDB').collection('TeamMemberData');
        const PurchaseCollection = client.db('TasteJourneyDB').collection('purchase');



        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log('User for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.cookie('token', token, cookieOption).send({ success: true, token });
        });


        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('Logging out', user);
            res.clearCookie('token',{...cookieOption, maxAge: 0}).send({ success: true });
        });

        app.get('/TasteJourneyAllFood', async (req, res) => {
            const foods = await TasteJourneyCollection.find().toArray();
            res.send(foods);
        });




        app.post('/TasteJourneyAllFood', async (req, res) => {
            try {
                const { food_name, food_image, food_category, added_by, food_origin, price, quantity, description } = req.body;
                const { name, email } = added_by;

                const newFood = {
                    food_name,
                    food_image,
                    food_category,
                    added_by: { name, email },
                    food_origin,
                    price: Number(price),
                    quantity: Number(quantity),
                    orderCount: 0,
                    description
                };

                console.log(newFood);

                const result = await TasteJourneyCollection.insertOne(newFood);
                res.send(result);
            } catch (error) {
                console.error('Error new food item:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });




        app.get('/TasteJourneyAllFood/:id', async (req, res) => {
            const id = req.params.id;
            const food = await TasteJourneyCollection.findOne({ _id: new ObjectId(id) });
            res.send(food);
        });

        app.put('/TasteJourneyAllFood/:id', async (req, res) => {
            const id = req.params.id;
            const food = req.body;
            console.log(food);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    ...food,
                    added_by: { name: food.name, email: food.email },
                }
            };
            const options = { upsert: true };
            const result = await TasteJourneyCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        app.delete('/TasteJourneyAllFood/:id', async (req, res) => {
            const id = req.params.id;
            console.log('Delete ID:', id);
            const result = await TasteJourneyCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        // app.get('/GalleryData', logger, async (req, res) => {
        //     // console.log('Query email:', req.query.email);
        //     // console.log('User email:', req.user.email);
        //     // console.log('User in valid token:', req.user);
        //     // // const query = req.query.email ? { email: req.query.email } : {};
        //     // console.log("The query is:", query);
        //     const result = await GalleryCollection.find().toArray();
        //     res.send(result);
        // });


        app.get('/GalleryData', async (req, res) => {
            const result = await GalleryCollection.find().toArray();
            res.send(result);
        });




        app.post('/GalleryData', async (req, res) => {
            const newGalleryData = req.body;
            console.log(newGalleryData);
            const result = await GalleryCollection.insertOne(newGalleryData);
            res.send(result);
        });

        app.get('/teamMember', async (req, res) => {
            const teamMembers = await TeamMemberCollection.find().toArray();
            res.send(teamMembers);
        });







        app.post('/purchase/:id', async (req, res) => {
            const newPurchases = req.body;
            const quantity = newPurchases.quantity;
            console.log(1, newPurchases);
            console.log('quantity', quantity);
            const id = req.params.id;
            await TasteJourneyCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { quantity: - newPurchases.quantity, orderCount: +1 } },
            )
            const result = await PurchaseCollection.insertOne(newPurchases);
            res.send(result);
        });




        app.get('/purchase', async (req, res) => {
            const purchases = await PurchaseCollection.find().toArray();
            res.send(purchases);
        });

        app.get('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const food = await PurchaseCollection.findOne({ _id: new ObjectId(id) });
            res.send(food);
        });

        app.put('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const user = req.body;
            console.log(user)
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true }
            const updateUser = {
                $set: {
                    food_image: user.food_image,
                    food_name: user.food_name,
                    price: user.price,
                    quantity: user.quantity,

                }
            }
            const result = await PurchaseCollection.updateOne(filter, updateUser, options)
            res.send(result)
        })

        app.delete('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            console.log('Delete ID:', id);
            const result = await PurchaseCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });





        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensure the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("TasteJourney server is running");
});

app.listen(port, () => {
    console.log(`TasteJourney server is running on port: ${port}`);
});
