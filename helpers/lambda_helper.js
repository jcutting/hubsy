// Lex and Amazon Skills have slots in different ways. This helper will parse
// them and return them to you. Agnostic of what the slot types are it will
// map them properly and give you a common object back.
exports.parseSlots = (event) => {
    var slots = {};

    // Parse Amazon Skill slots.
    if(event.request !== undefined) {
        console.log("Parsing Alexa Skills");

        for(var skillKey in event.request.intent.slots) {
            // Keep types the same.
            if(event.request.intent.slots[skillKey].value === undefined) {
                event.request.intent.slots[skillKey].value = null;
            } else {
                event.request.intent.slots[skillKey].value = event.request.intent.slots[skillKey].value.toLowerCase();
            }

            slots[skillKey] = {
                name  : skillKey,
                value : event.request.intent.slots[skillKey].value
            };
        };
    }

    // Parse Lex slots.
    if(event.currentIntent !== undefined) {
        console.log("Parsing Lex Skills");

        for(var lexKey in event.currentIntent.slots) {
            // Keep types the same.
            if(event.currentIntent.slots[lexKey] === undefined) {
                event.currentIntent.slots[lexKey] = null;
            } else {
                event.currentIntent.slots[lexKey].value = event.currentIntent.slots[lexKey].value.toLowerCase();
            }

            slots[lexKey] = {
                name  : lexKey,
                value : event.currentIntent.slots[lexKey].value.toLowerCase()
            };
        }
    }

    console.log(`Parsed Slots: ${JSON.stringify(slots)}`);

    return slots;
};

// Wrapper for making a closing callback to Lambda.
exports.processCallback = (callback, event, fulfillmentState, message) => {
    console.log(`Fulfillment State: ${fulfillmentState}`);
    console.log(`Message: ${message}`);
    console.log(`Callback Event: ${JSON.stringify(event)}`);

    // Verify the developer passed a valid fulfillmentState.
    if(fulfillmentState !== "Failed" && fulfillmentState !== "Fulfilled") {
        fulfillmentState = "Failed";
        message = "You have provided an invalid fulfillment state. It must be either Failed or Fulfilled.";
    }

    // Send back to Alexa Skill if there is an event.version. Otherwise
    // we know there is an event.messageVersion which is for Lex.
    if(event.messageVersion !== undefined) {
        console.log("Responding To Lex");

        callback(null, {
            "dialogAction" : {
                "type" : "Close",
                "fulfillmentState" : fulfillmentState,
                "message" : {
                    "contentType" : "PlainText",
                    "content" : message
                }
            }
        });
    } else {
        console.log("Responding To Alexa");

        callback(null, {
            version : "1.0",
            sessionAttributes : {},
            response : {
                outputSpeech : {
                    type : "PlainText",
                    text : message,
                },
                card : {
                    type : "Simple",
                    title : "Ken Bot",
                    content : message,
                },
                shouldEndSession : true,
            },
        });
    }
};

// Wrapper for making a validation callback to Lambda.
exports.processValidation = (callback, event, slot_to_elicit, message) => {
    console.log(`Slot To Elicit: ${slot_to_elicit}`);
    console.log(`Message: ${message}`);
    console.log(`Validation Event: ${JSON.stringify(event)}`);

    if(event.messageVersion !== undefined) {
        console.log("Validating To Lex");

        callback(null, {
            sessionAttributes : event.sessionAttributes,
            dialogAction : {
                type : "ElicitSlot",
                intentName : event.currentIntent.name,
                slots : event.currentIntent.slots,
                slotToElicit : slot_to_elicit,
                message : {
                    contentType : "PlainText",
                    content : message
                },
            },
        });
    } else {
        console.log("Validating To Alexa");

        event.request.intent.slots[slot_to_elicit].confirmationStatus = "NONE";

        callback(null, {
            version : "1.0",
            sessionAttributes : {},
            response : {
                outputSpeech : {
                    type : "PlainText",
                    text : message,
                },
                card : {
                    type : "Simple",
                    title : "Ken Bot",
                    content : message,
                },
                shouldEndSession : false,
                directives: [
                    {
                        type : "Dialog.ElicitSlot",
                        slotToElicit : slot_to_elicit,
                        updatedIntent : {
                            name : event.request.intent.name,
                            confirmationStatus : "NONE",
                            slots : event.request.intent.slots
                        }
                    }
                ]
            },
        });
    }
};
