const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

//job_hunter
//71WYBKpV6VV8mous



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


        //jobs related apis
        app.get('/jobs', async (req, res) => {

            const email = req.query.email;
            let query = {};
            if(email){
                query = { hr_email: email}
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

        app.post('/jobs', async(req, res) => {
            const newJob = req.body;
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        })

        //job application apis

        app.get('/job-applications', async (req, res) => {
            const email = req.query.email;
            const query = { applicant_email: email };
            const result = await jobApplicationCollection.find(query).toArray();


            //fokira way
            for (const application of result) {
                console.log(application.job_id);
                const query1 = { _id: new ObjectId(application.job_id) };
                const job = await jobsCollection.findOne(query1);

                if(job){
                    application.title = job.title;
                    application.location = job.location;
                    application.company = job.company;
                    application.company_logo = job.company_logo;
                   
                }
            }

            res.send(result);

        })

        app.post('/job-applications', async (req, res) => {
            const application = req.body;
            const result = await jobApplicationCollection.insertOne(application);
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