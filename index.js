const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


const verifyToken = (req, res, next) => {

    const token = req?.cookies?.token;
    console.log('inside verifyToken middleware', token);

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access' });
        }

        req.user = decoded;

        next();
    })

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zlvar1f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


        const jobsCollection = client.db('jobPortal').collection('jobs');

        const jobApplicationCollection = client.db('jobPortal').collection('job_applications');


        //Auth related APIs
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
            })
                .send({ success: true });
        });

        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: false
            })
                .send({ success: true })
        })

        //jobs related apis
        app.get('/jobs', async (req, res) => {
            console.log('now');
            const email = req.query.email;
            let query = {};
            if (email) {
                query = { hr_email: email }
            }

            const cursor = jobsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.findOne(query);
            res.send(result);
        })

        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        })

        //job application apis

        app.get('/job-applications', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { applicant_email: email };

            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const result = await jobApplicationCollection.find(query).toArray();


            //fokira way
            for (const application of result) {
                console.log(application.job_id);
                const query1 = { _id: new ObjectId(application.job_id) };
                const job = await jobsCollection.findOne(query1);

                if (job) {
                    application.title = job.title;
                    application.location = job.location;
                    application.company = job.company;
                    application.company_logo = job.company_logo;

                }
            }

            res.send(result);

        })

        app.get('/job-applications/jobs/:job_id', async (req, res) => {
            const jobId = req.params.job_id;
            const query = { job_id: jobId };
            const result = await jobApplicationCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/job-applications', async (req, res) => {
            const application = req.body;
            const result = await jobApplicationCollection.insertOne(application);


            //not the best way (use aggregate)
            const id = application.job_id;
            const query = { _id: new ObjectId(id) }
            const job = await jobsCollection.findOne(query);

            let newCount = 0;
            if (job.applicationCount) {
                newCount = job.applicationCount + 1
            }
            else {
                newCount = 1;
            }

            //NOW update the job info
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    applicationCount: newCount
                }
            }

            const updateResult = await jobsCollection.updateOne(filter, updatedDoc);


            res.send(result);
        })

        app.patch('/job-applications/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: data.status
                }
            }
            const result = await jobApplicationCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Job is falling from the sky');
})

app.listen(port, () => {
    console.log(`Job is waiting at: ${port}`);
})