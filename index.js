require('dotenv').config()
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
const port = process.env.PORT ||5000;


app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://electrosavvy-57a30.web.app',
    'https://electrosavvy-57a30.firebaseapp.com/'
    ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


const verifyToken = ( req, res, next ) => {
  const token = req.cookies.token

  if( !token ){
    return res.status(401).send({ message : 'Unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, ( err, decoded ) => {
    if( err ) {
      return res.status(401).send({ message : 'Unauthorized access'})
    }
    req.user = decoded
    next()
  })
}



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
    // await client.connect();


    const serviceCollection = client.db('ElectroSavvyDB').collection('Services')
    const bookedServicesCollection = client.db('ElectroSavvyDB').collection('BookedServices')
    const commentsCollection = client.db('ElectroSavvyDB').collection('comments')

    // Auth APIs
    app.post('/jwt', (req, res)=> {
      const user = req.body
      const token = jwt.sign( user, process.env.ACCESS_TOKEN_SECRET, {expiresIn : '1h'})
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      }).send({success : true})
    })

    app.post('/logout', (req, res)=>{
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      }).send({success: true})
    })

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

    app.get('/trending-services', async (req, res) => {
      const result = await serviceCollection.find().limit(6).toArray()
      res.send(result)
    })


    app.get('/service-detail/:id', verifyToken, async (req,res)=>{
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await serviceCollection.findOne(query)
      res.send(result)
    })

    app.get('/manage-services', verifyToken, async (req, res)=>{
      const {email} = req.query

      if(req.user.email !== email){
        return res.status(403).send({message: 'Forbidden Access'})
      }

      const option = { serviceProviderEmail: email }
      const result = await serviceCollection.find(option).toArray()
      res.send(result)
    })

    app.patch('/update-service/:id', verifyToken, async (req, res)=>{
      const id = req.params.id
      const updateData = req.body
      // console.log(updateData)
      const query = {_id : new ObjectId(id)}
      const update = {
        $set: { 
          serviceName : updateData.serviceName, 
          serviceImage : updateData.serviceImage, 
          servicePrice : updateData.servicePrice, 
          ServiceArea : updateData.ServiceArea , 
          description : updateData.description
        },
      }
      const result = await serviceCollection.updateOne( query , update )
      res.send(result)
    })


    app.post('/services', verifyToken, async (req, res)=>{
      const newService = req.body
      const result = await serviceCollection.insertOne(newService)
      res.send(result)
    })

    app.delete("/services/:id", verifyToken, async (req,res)=>{
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await serviceCollection.deleteOne(query)
      res.send(result)
    })

    // Booked Collection APIs
    app.get('/booked-services', verifyToken, async (req, res)=>{
      const {email} = req.query

      if(req.user.email !== email){
        return res.status(403).send({message: 'Forbidden Access'})
      }

      const option = {currentUserEmail: email}
      const result = await bookedServicesCollection.find(option).toArray()
      res.send(result)
    })

    app.post('/booked-services', verifyToken, async (req, res)=>{
      const newBookedService = req.body
      const result = await bookedServicesCollection.insertOne(newBookedService)
      res.send(result)
    })

    app.delete("/booked-services/:id", verifyToken, async (req,res)=>{
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await bookedServicesCollection.deleteOne(query)
      res.send(result)
    })


    app.patch("/booked-services/:id", verifyToken, async (req,res)=>{
      const id = req.params.id
      const updateData = req.body

      const query = {_id : new ObjectId(id)}
      const update = {
        $set: { 
          status : updateData.status,
        },
      }

      const result = await bookedServicesCollection.updateOne(query, update)
      res.send(result)
    })

    // service to do apis
    app.get('/to-do-services', verifyToken, async (req, res)=>{
      const {email} = req.query

      if(req.user.email !== email){
        return res.status(403).send({message: 'Forbidden Access'})
      }

      const option = {serviceProviderEmail: email}
      const result = await bookedServicesCollection.find(option).toArray()
      res.send(result)
    })


    // comments apis
    app.get('/comments', async (req, res )=>{
      
      result = await commentsCollection.find().toArray()
      res.send(result)
    })


    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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