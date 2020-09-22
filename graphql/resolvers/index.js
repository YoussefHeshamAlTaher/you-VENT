
const bcrypt = require('bcryptjs');
const Event = require('../../models/event');
const User = require('../../models/user');
const Booking = require('../../models/booking');
const booking = require('../../models/booking');
const jwt = require('jsonwebtoken');
const DataLoader = require('dataloader');
const event = require('../../models/event');

const eventLoader = new DataLoader((eventIds) => {
    return events(eventIds);
});
const userLoader = new DataLoader(userIds => {
    return User.find({_id : {$in : userIds}});
});

const transformEvent = event => {
    return {
            ...event._doc ,
            _id: event._doc._id,
            date : new Date(event._doc.date).toISOString(),
           creator : user.bind(this,event._doc.creator)
          };
};
const transformBooking = booking => {
    return {
        ...booking._doc,
         _id : booking.id ,
         user : user.bind(this,booking._doc.user),
         event : singleEvent.bind(this,booking._doc.event),
         createdAt : new Date(booking._doc.createdAt).toISOString(),
         updatedAt : new Date(booking._doc.updatedAt).toISOString()
        };
};

const events = eventIds => {
    return Event.find({ _id : { $in: eventIds }})
    .then(events => {
        return events.map(event =>{
            return transformEvent(event);
        });
    })
    .catch(err => {
        throw err;
    });
}


const user = userId => {
    return User.findById(userId)
    .then(user => {
        return {...user._doc, _id: user.id, createdEvents: events.bind(this,user._doc.createdEvents)};
    })
    .catch(err => {
        throw err;
    });
}
const singleEvent = async eventId => {
    try{
        const event = await Event.findById(eventId);;
        return event;

    }catch(err) {
        throw err;
    }
};


module.exports = {
        events: () => {
            return Event.find().populate('creator')
            .then(events => {
                return events.map(event => {
                    return transformEvent(event);
                });
            })
            .catch(err => {
                throw err;
            });
        },
        bookings : async (args,req) => {
            try{
             const bookings= await Booking.find({user:req.userId});
             return bookings.map(booking =>{
                 return transformBooking(booking);
             })
            } catch (err) {
                throw err;
            }
        },
        createEvent : (args,req) => {
            if(!req.isAuth){
                throw new Error ('Unauthorized Acsses!')
            }
            const event = new Event ({
                title:args.eventinput.title,
                description : args.eventinput.description,
                price : +args.eventinput.price,
                date :new Date( args.eventinput.date),
                creator: req.userId
            });
            let createdEvent;
            return event
            .save()
            .then(result => {
                createdEvent = transformEvent(result);
                return User.findById(req.userId)
                
            })
            .then(user => {
                if(!user){
                    throw new Error ('User not found');
                }
                user.createdEvents.push(event);
                return user.save();
            })
            .then(result => {
                return createdEvent;
            })
            .catch(err => {
                console.log(err);
                throw err;
            });
            
         

        },
        createUser : args => {
           return User.findOne({email: args.userinput.email}).then(user =>{
                if(user){
                    throw new Error('User Already Exists');
                }
                return bcrypt
                .hash(args.userinput.password,12)
            })
            .then(hashedPassword => {
               const user = new User({
                   email : args.userinput.email,
                   password : hashedPassword
               });
              return  user.save();

            })
            .then(result => {
                return {...result._doc,password : null ,_id: result.id};
            })
            .catch(err => {
                throw err
            });
        },
        bookEvent : async (args,req) => {
            if(!req.isAuth){
                throw new Error ('Unauthorized Acsses!')
            }
            const fetchedEvent = await Event.findOne({_id:args.eventId});
            const booking = new Booking ({
                user : req.userId,
                event : fetchedEvent

            });
            const result = await booking.save();
            return transformBooking(result);
        },
        cancelBooking : async (args,req) => {
            if(!req.isAuth){
                throw new Error ('Unauthorized Acsses!')
            }
            try{
                
              const booking = await Booking.findById(args.bookingId).populate('event');  
              const event = transformEvent(booking.event);
              await Booking.deleteOne({_id : args.bookingId})
              return event;


            }catch(err){
                throw err;
            }

        },
        login: async ({email,password}) => {
            const userlogin =  await User.findOne({email :email});
            if(!userlogin){
                throw new Error ('Email is not correct');
            }
           const isEqual = await bcrypt.compare(password, userlogin.password);
           if(!isEqual){
            throw new Error ('Password is not correct');
           }
           const token =jwt.sign(
               {userId : userlogin.id, email:userlogin.email}, 'ana-msh-3arefny-ana-toht-mny-ana-msh-ana',{
               expiresIn : '1h'
           });
           return {userId:userlogin.id, token: token , tokenExpiration:1}; 
        }
        
    };