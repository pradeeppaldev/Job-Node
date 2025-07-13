import { Webhook } from "svix";
import User from "../models/User";

// API Controller Function to Manage Clerk User with database
export const clerkWebhooks = async (req, res) => {
    try {
        
        // create a Svix instance with clerk secret
        const whook = new Webhook (process.env.CLERK_WEBHOOK_SECRET)

        // Verifying Headers
        await whook.verify(JSON.stringify(req.body),{
            "svix-id": req.headers["svix-timestamp"],
            "svix-signature" : req.headers["svix-signature"]
        })

        // Getting Data form request body
        const {data, type} = req.body

        // Switch cases for different events
        switch (type) {
            case 'user.created':{
                const userData = {
                    _id:data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    image: data.image_url,
                    resume: ''
                }
                await User.create(userData)
                res.json({})
                break
            }
            case 'user.updated':{
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    image: data.image_url,
                }
                await User.findByIdAndUpdate(data.id, userData)
                break
            }
            case 'user.deleted':{
                await User.findByIdAndDelete(data.id)
                res.json({})
                break
            }
        
            default:
                break;
        }

    } catch (error) {
        console.log(error.message)
        res.send({success:false, message:'Webhooks Error'})
    }
}