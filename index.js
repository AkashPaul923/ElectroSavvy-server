require('dotenv').config()
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
const port = process.env.PORT ||5000;


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xlwti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const serviceCollection = client.db('ElectroSavvyDB').collection('Services')
    const bookedServicesCollection = client.db('ElectroSavvyDB').collection('BookedServices')



    // services APIs
    app.get('/services', async (req, res) => {
      const { search } = req.query
      let option = {}
      if(search){
        option = {serviceName : { $regex : search , $options : 'i' }}
      }
      const result = await serviceCollection.find(option).toArray()
      res.send(result)
    })


    app.get('/service-detail/:id', async (req,res)=>{
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await serviceCollection.findOne(query)
      res.send(result)
    })

    app.get('/manage-services', async (req, res)=>{
      const {email} = req.query
      const option = { serviceProviderEmail: email }
      const result = await serviceCollection.find(option).toArray()
      res.send(result)
    })
    
    app.post('/services', async (req, res)=>{
      const newService = req.body
      const result = await serviceCollection.insertOne(newService)
      res.send(result)
    })

    // Booked Collection APIs
    app.get('/booked-services', async (req, res)=>{
      const {email} = req.query
      const option = {currentUserEmail: email}
      const result = await bookedServicesCollection.find(option).toArray()
      res.send(result)
    })

    app.post('/booked-services', async (req, res)=>{
      const newBookedService = req.body
      const result = await bookedServicesCollection.insertOne(newBookedService)
      res.send(result)
    })


    
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
    res.send('ElectroSavvy server is running')
})
  
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})