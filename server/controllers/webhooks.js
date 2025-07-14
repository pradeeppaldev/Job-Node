import { Webhook } from "svix";
import User from "../models/User.js";
import connectDB from "../config/db.js";

export const clerkWebhooks = async (req, res) => {
  try {
    await connectDB();

    // Convert raw body
    const payload = req.body.toString();
    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-signature": req.headers["svix-signature"],
      "svix-timestamp": req.headers["svix-timestamp"],
    };

    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const event = whook.verify(payload, headers);

    console.log("📥 Clerk Webhook received");
    console.log("👉 Event Type:", event.type);

    const { type, data } = event;

    switch (type) {
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: `${data.first_name} ${data.last_name}`,
          image: data.image_url,
          resume: "",
        };

        console.log("📦 Creating user:", userData);

        try {
          await User.findByIdAndUpdate(
            data.id,
            { $setOnInsert: userData },
            { upsert: true, new: true }
          );
          console.log("✅ User created or already exists");
        } catch (err) {
          console.error("❌ Failed to create user:", err.message);
        }

        break;
      }

      case "user.updated": {
        const updatedData = {
          email: data.email_addresses[0].email_address,
          name: `${data.first_name} ${data.last_name}`,
          image: data.image_url,
        };

        console.log("🔄 Updating user:", data.id, updatedData);

        try {
          await User.findByIdAndUpdate(data.id, updatedData);
          console.log("✅ User updated");
        } catch (err) {
          console.error("❌ Failed to update user:", err.message);
        }

        break;
      }

      case "user.deleted": {
        console.log("🗑 Deleting user:", data.id);

        try {
          await User.findByIdAndDelete(data.id);
          console.log("✅ User deleted");
        } catch (err) {
          console.error("❌ Failed to delete user:", err.message);
        }

        break;
      }

      default:
        console.warn("⚠️ Unhandled event type:", type);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ success: false, message: "Webhook Error" });
  }
};



/*import { Webhook } from "svix";
import User from "../models/User.js";
import connectDB from "../config/db.js";

export const clerkWebhooks = async (req, res) => {
  try {
    await connectDB();

    const payload = req.body.toString(); // raw body
    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-signature": req.headers["svix-signature"],
      "svix-timestamp": req.headers["svix-timestamp"],
    };

    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const event = whook.verify(payload, headers);

    console.log("✅ Webhook verified");

    const { type, data } = event;

    switch (type) {
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: `${data.first_name} ${data.last_name}`,
          image: data.image_url,
          resume: "",
        };
        await User.create(userData);
        console.log("✅ User created in MongoDB");
        break;
      }

      case "user.deleted": {
        await User.findByIdAndDelete(data.id);
        console.log("❌ User deleted");
        break;
      }

      case "user.updated": {
        const userData = {
          email: data.email_addresses[0].email_address,
          name: `${data.first_name} ${data.last_name}`,
          image: data.image_url,
        };
        await User.findByIdAndUpdate(data.id, userData);
        console.log("🔄 User updated");
        break;
      }

      default:
        console.log("⚠️ Unhandled event:", type);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ success: false, message: "Webhook Error" });
  }
};
*/

/*import { Webhook } from "svix";
import User from "../models/User.js";

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

        console.log("Inside clerkWebhook Function")

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
                console.log("✅ User created in MongoDB");
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
                console.log("Unhandled event type")
                res.status(400).json({ message: "Unhandled event type" });
        }

    } catch (error) {
        console.log(error.message)
        res.send({success:false, message:'Webhooks Error'})
    }
}*/