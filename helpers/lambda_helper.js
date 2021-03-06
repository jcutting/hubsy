const config = require(__dirname + "/../config/config.json");

// Local function for attaching a response card to an event.
var createCard = (cards) => {
    return {
        contentType : "application/vnd.amazonaws.card.generic",
        genericAttachments : cards
    };
};

var getContactInfoCards = (title) => {
    var cards = [{ title : title, buttons : [ ] }];

    cards[0].buttons.push({ text : "Summary", value : "summary" });
    cards[0].buttons.push({ text : "Email", value : "email" });
    cards[0].buttons.push({ text : "Title", value : "title" });
    cards[0].buttons.push({ text : "Phone", value : "phone" });

    return cards;
};

// Constant timeframe cards.
var getTimeframeCards = (title) => {
    var cards = [{ title : title, buttons : [ ] }];
    var timeframes = [
        { "name" : "Today" },
        { "name" : "Yesterday" },
        { "name" : "This Week" },
        { "name" : "Last Week" },
        { "name" : "Last Month" }
    ];

    timeframes.forEach((timeframe) => {
        cards[0].buttons.push({ text : timeframe.name, value : timeframe.name.toLowerCase() });
    });

    return cards;
};

// Constant engagement cards.
var getEngagmentCards = (title) => {
    var cards = [{ title : title, buttons : [ ] }];

    config.engagements.forEach((engagement) => {
        cards[0].buttons.push({ text : engagement.name.charAt(0) + engagement.name.slice(1).toLowerCase(), value : engagement.name });
    });

    return cards;
};

// Constant stage cards.
var getStageCards = (title) => {
    var cards = [{ title : title, buttons : [ ] }];

    config.stages.forEach((stage) => {
        cards[0].buttons.push({ text : stage.name.charAt(0).toUpperCase() + stage.name.slice(1), value : stage.name });
    });

    return cards;
};

// Confirmation cards.
var getConfirmationCards = (title) => {
    var cards = [
        {
            title : title,
            buttons : [
                { text : "Yes", value : "yes" },
                { text : "No", value : "no" }
            ]
        }
    ];

    return cards;
};

// Constant sales cards.
var getSalesCards = (title) => {
    var cards = [{ title : title, buttons : [ ] }];

    config.sales_people.forEach((sales) => {
        cards[0].buttons.push({ text : `${sales.first.charAt(0).toUpperCase()}${sales.first.slice(1)} ${sales.last.charAt(0).toUpperCase()}${sales.last.slice(1)}`, value : `${sales.first} ${sales.last}` });
    });

    return cards;
};

// Lex and Amazon Skills have slots in different ways. This helper will parse
// them and return them to you. Agnostic of what the slot types are it will
// map them properly and give you a common object back.
exports.parseSlots = (event) => {
    var slots = {};

    // Parse Amazon Skill slots.
    if(event.request !== undefined) {
        console.log("Parsing Alexa Skills");
        console.log(`Before Parse: ${JSON.stringify(event.request.intent.slots)}`);

        for(var skillKey in event.request.intent.slots) {
            // Keep types the same.
            if(event.request.intent.slots[skillKey].value === undefined) {
                event.request.intent.slots[skillKey].value = null;
            } else if(event.request.intent.slots[skillKey].value !== null) {
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
        console.log(`Before Parse: ${JSON.stringify(event.currentIntent.slots)}`);

        for(var lexKey in event.currentIntent.slots) {
            // Keep types the same.
            if(event.currentIntent.slots[lexKey] === undefined) {
                event.currentIntent.slots[lexKey] = null;
            } else if(event.currentIntent.slots[lexKey] !== null) {
                event.currentIntent.slots[lexKey] = event.currentIntent.slots[lexKey].toLowerCase();
            } else {
                event.currentIntent.slots[lexKey] = null;
            }

            slots[lexKey] = {
                name  : lexKey,
                value : event.currentIntent.slots[lexKey]
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
        message          = "You have provided an invalid fulfillment state. It must be either Failed or Fulfilled.";
    }

    // Send back to Alexa Skill if there is an event.version. Otherwise
    // we know there is an event.messageVersion which is for Lex.
    if(event.messageVersion !== undefined) {
        console.log("Responding To Lex");

        callback(null, {
            sessionAttributes : {},
            dialogAction : {
                type : "Close",
                fulfillmentState : fulfillmentState,
                message : {
                    contentType : "PlainText",
                    content : message
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

// Wrapper for processing the session attributes wether its Lex or Alexa.
exports.parseSession = (event) => {
    console.log(`Parsing Session: ${JSON.stringify(event)}`);

    if(event.sessionAttributes !== undefined && event.sessionAttributes !== null) {
        return event.sessionAttributes;
    } else if(event.session !== undefined && event.session.attributes !== undefined) {
        return event.session.attributes;
    } else {
        return {};
    }
};

// Wrapper for setting the session attributes whether its Lex or Alexa.
exports.setSession = (event, sessionAttributes) => {
    console.log(`Session Attributes Are: ${JSON.stringify(sessionAttributes)}`);

    if(event.messageVersion !== undefined) {
        console.log("Setting Session For Lex");

        event.sessionAttributes = sessionAttributes;
    } else {
        console.log("Setting Session For Alexa");

        event.session.attributes = sessionAttributes;
    }

    return event;
};

// Wrapper for setting the slots whether its Lex or Alexa.
exports.setSlot = (event, slot, value) => {
    console.log(`Slots Are: ${JSON.stringify(event.currentIntent.slots)}`);

    if(event.messageVersion !== undefined) {
        console.log("Setting Session For Lex");

        event.currentIntent.slots[slot] = value;

        console.log(`${slot} has been set to ${value}`);
    }

    return event;
};

// Wrapper for making a validation callback to Lambda.
exports.processValidation = (callback, event, slot_to_elicit, message) => {
    var response = {};

    console.log(`Slot To Elicit: ${slot_to_elicit}`);
    console.log(`Message: ${message}`);
    console.log(`Validation Event: ${JSON.stringify(event)}`);

    if(event.messageVersion !== undefined) {
        console.log("Validating To Lex");

        response = {
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
        };

        // Create the cards based on the slot to elicit.
        if(slot_to_elicit === "stage") {
            response.dialogAction.responseCard = createCard(getStageCards("What stage would you like?"));
            response.dialogAction.message = null;
        } else if(slot_to_elicit === "sales" || slot_to_elicit === "salesOne" || slot_to_elicit === "salesTwo") {
            if(slot_to_elicit === "salesOne") {
                response.dialogAction.responseCard = createCard(getSalesCards("What sales person would you like first?"));
            } else if(slot_to_elicit === "salesTwo") {
                response.dialogAction.responseCard = createCard(getSalesCards("What sales person would you like me to compare with?"));
            } else {
                response.dialogAction.responseCard = createCard(getSalesCards("What sales person would you like?"));
            }

            response.dialogAction.message = null;
        } else if(slot_to_elicit === "confirmation" || slot_to_elicit === "contact_confirmation") {
            response.dialogAction.responseCard = createCard(getConfirmationCards("Confirm?"));
        } else if(slot_to_elicit === "engagements") {
            response.dialogAction.responseCard = createCard(getEngagmentCards("What engagement would you like?"));
            response.dialogAction.message = null;
        } else if(slot_to_elicit === "timeframe") {
            response.dialogAction.responseCard = createCard(getTimeframeCards("What timeframe would you like?"));
            response.dialogAction.message = null;
        } else if(slot_to_elicit === "contact_info") {
            response.dialogAction.responseCard = createCard(getContactInfoCards("What contact info would you like?"));
            response.dialogAction.message = null;
        }

        console.log(`Lex Response: ${JSON.stringify(response)}`);

        callback(null, response);
    } else {
        console.log("Validating To Alexa");

        event.request.intent.slots[slot_to_elicit].confirmationStatus = "NONE";

        response = {
            version : "1.0",
            sessionAttributes : event.session.attributes,
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
        };

        console.log(`Alexa Response: ${JSON.stringify(response)}`);

        callback(null, response);
    }
};
