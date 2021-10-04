const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path')
const https = require('https')
const { autoUpdater } = require('electron-updater');

const Store = require('electron-store');
const store = new Store();

let key = "";

let mainWindows;
let keyWindow;

autoUpdater.on('error', (err)=>{
    mainWindows.webContents.send('update_error', err);
})

autoUpdater.on('update-available', () => {
    mainWindows.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
    mainWindows.webContents.send('update_downloaded');
});

function getCacheKey(){

    if(store.get("userkey") !== undefined){
    key = store.get("userkey");
    return key;
    } else {
        return "NOKEY"
    }
}

function verifyKey(key, start = false, justTest = false, callback = function () {}){

    function verify(res){
        //console.log('Status code: '+res.statusCode);

        let data = ''

        res.on('data', args => {
            data+=args;
        })

        res.on('end', ()=>{

            if(JSON.parse(data).ResultCode === 1 && JSON.parse(data).valid) {
                console.log("Code OK");
                callback(true);
                return true;
            } else {
                if(JSON.parse(data).ResultCode === 2){
                    if(!start) return false;
                    if(start){
                        if(!justTest) {
                            mainWindows.loadFile("index.html");
                        } else {
                            console.error("Code not true");
                            callback(false);
                        }
                    }
                } else {
                    if(!justTest) {
                        if (!mainWindows.destroyed) {
                            mainWindows.loadFile("index.html");
                        }
                    } else {
                        console.error("Code not exist");
                    }
                    callback(false);
                    return false;
                }
            }
        })

        console.log("REQ");
    }


    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/user/check/key",
        method: "POST",
        headers:{
            "content-type": 'application/json'
        }
    }

    dataToWrite = {
        "key": key
    }

    console.log(options.path);
    const req = https.request(options);

    req.write(JSON.stringify(dataToWrite));

    req.end();

    req.on('error', error => {
        console.error(error)
    })

    req.on("response", res=>{

        verify(res);

    })
}


function authKey(key){

    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/user/check/key",
        method: "GET",
        headers:{
            "content-type": 'application/json'
        }
    }

    const dataToWrite = {

        "key": key

    }

    const req = https.request(options);

    req.write(dataToWrite);

    req.end();

    req.on("continue", res=>{

        let data = "";

        res.on("data", (chunk)=>{

            data+=chunk;

        });

        res.on("end", ()=>{
            mainWindows.webContents.send("authKeyResponse", data);
        })

    })

}
function authAccount(name, password){

    function registerPassword(uid, dataToReturn){
        let options = {
            hostname: "misterx-94495.herokuapp.com",
            path: "/app/user/change",
            method: "POST",
            headers:{
                "content-type": 'application/json'
            }
        }

        const req = https.request(options, res=>{

        });

        let data = {

            "adminKey": "fed18535-5c38-4a51-937f-d7ecbd334545",
            "username": name,
            "password": password,
            "uid": uid,

        }

        req.write(JSON.stringify(data));

        req.end();

        req.on("response", response => {

            let returnData = "";

            response.on("data", chunk => {

                returnData += chunk;

            })

            response.on("end", () => {

                returnData = JSON.parse(returnData);

                if(returnData.ResultCode === 1) {

                    console.log(returnData);
                    dataToReturn.password = true;
                    key = dataToReturn.uid;
                    mainWindows.webContents.send("authAccountResponse", dataToReturn);

                } else {

                    console.error(returnData.message);

                }
            })


        })

    }

    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/user/check/account",
        method: "POST",
        headers:{
            "content-type": 'application/json'
        }
    }

    const dataToWrite = {

        "name": name,
        "password": password

    }

    const req = https.request(options);

    req.write(JSON.stringify(dataToWrite));

    req.end();

    req.on("response", res=>{

        let data = "";

        res.on("data", (chunk)=>{

            data+=chunk;

        });

        res.on("end", ()=>{

            data = JSON.parse(data);

            if(data.ResultCode === 1){

                console.log("result");

                if(data.name){
                    console.log("name");

                    if(data.password === "empty"){

                        registerPassword(data.uid, data);

                    }

                    if(data.password){
                        key = data.uid;
                    }

                }

                mainWindows.loadFile("quiz.html");

                mainWindows.webContents.send("authAccountResponse", data);

            }
        })

    })

}

function createKeyWindow(){
    keyWindow = new BrowserWindow({
        width: 400,
        height: 200,
        autoHideMenuBar: true,
        resizable: false,
        webPreferences:{
            nodeIntegration: false, // is default value after Electron v5
            contextIsolation: true, // protect against prototype pollution
            enableRemoteModule: false, // turn off remote
            preload: path.join(__dirname, "preload.js"), // use a preload script
            nativeWindowOpen: true
        }
    })
    keyWindow.loadFile('askKey.html');
}

function createWindow(){
    mainWindows = new BrowserWindow({
        width: 800,
        height: 400,
        autoHideMenuBar: true,
        webPreferences:{
            nodeIntegration: false, // is default value after Electron v5
            contextIsolation: true, // protect against prototype pollution
            enableRemoteModule: false, // turn off remote
            preload: path.join(__dirname, "preload.js"), // use a preload script
            nativeWindowOpen: true
        }
    })

    mainWindows.loadFile('index.html');

    mainWindows.once("ready-to-show", ()=>{
        autoUpdater.checkForUpdatesAndNotify();
    })
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    verifyKey(getCacheKey(), true, false);
})
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('buttonNewAccount', async function (ipc, data, options) {

    const req = https.request(options, res=>{
        console.log('Status code: '+res.statusCode);
    });

    req.on('error', error => {
        console.error(error)
    })

    data.adminKey = key;

    console.log(key);

    console.log(data);

    req.write(JSON.stringify(data))
    req.end()

    req.on('response', response => {
        mainWindows.webContents.send("createdAccount", response.statusCode);
    })

});
ipcMain.on("askAdminCode", function (ipc, ...args) {
   ipc.returnValue = "TESTReturn";
});
ipcMain.on("CheckKey", async function (ipc, ...args){
    console.log(args[0]);
    /*verifyKey(args[0], false, true, function (arg) {

        console.log(arg);

        if(arg){
            store.set("key", args[0])
            mainWindows.loadFile("index.html");
        } else {
            console.log("Code not valid");
        }
    });*/

})
ipcMain.on("changePage", function (ipc, ...args) {
    let page = args[0];

    switch (page){
        case "index":
            mainWindows.loadFile("index.html");
            break;
        case "quiz":
            mainWindows.loadFile("quiz.html");
            break;
        case "question":
            mainWindows.loadFile("question.html");
            break;
        default:
            console.error("Page asked: "+page);
            break;
    }
})

ipcMain.on("getAllQuiz", function (ipc, ...args) {


    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/quiz/getAll?key="+key,
        method: "GET",
        headers:{
            "content-type": 'application/json'
        }
    }

    const req = https.request(options, res=>{
        console.log('Status code: '+res.statusCode);

        let data = "";

        res.on('data', chunk => {
            data+=chunk;
        });

        res.on("end", () => {
            mainWindows.webContents.send("getAllQuizResponse", data);
        })
    })

    req.end();


})
ipcMain.on("createQuiz", function (ipc, title){

    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/quiz",
        method: "POST",
        headers:{
            "content-type": 'application/json'
        }
    }

    const req = https.request(options);

    let data = {
        "UIDAuthor": key,
        "title": title
    };

    req.write(JSON.stringify(data));

    req.end();

    req.on("response", response => {

        let responseData = "";

        response.on("data", chunk=>{

            responseData+=chunk;

        })


        response.on("end", () => {

            console.log(responseData);
            responseData = JSON.parse(responseData);

            mainWindows.webContents.send("createQuizResponse", responseData.ResultCode);

        })

    })

})
ipcMain.on("editQuiz", function (ipc, uid, title){

    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/quiz/change",
        method: "POST",
        headers:{
            "content-type": 'application/json'
        }
    }

    const req = https.request(options, res=>{

    });

    let data = {

        "key": key,
        "title": title,
        "uid": uid,

    }

    req.write(JSON.stringify(data));

    req.end();

    req.on("response", response => {

        let returnData = "";

        response.on("data", chunk => {

            returnData += chunk;

        })

        response.on("end", () => {

            returnData = JSON.parse(returnData);

            console.log(returnData);

            if(returnData.ResultCode === 1) {
                mainWindows.webContents.send("editQuizResponse");
            } else {

                console.error(returnData.message);

            }
        })


    })

});
ipcMain.on("removeQuiz", function (ipc, uid){

    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/quiz/remove",
        method: "POST",
        headers:{
            "content-type": 'application/json'
        }
    }

    const req = https.request(options, res=>{

    });

    let data = {

        "key": key,
        "uid": uid,

    }

    req.write(JSON.stringify(data));

    req.end();
    console.log(data);

    req.on("response", response => {

        let returnData = "";

        response.on("data", chunk => {

            returnData += chunk;

        })

        response.on("end", () => {

            returnData = JSON.parse(returnData);

            console.log(returnData);

            if(returnData.ResultCode === 1) {
                mainWindows.webContents.send("removeQuizResponse");
            } else {

                console.error(returnData);

            }
        })


    })

})
ipcMain.on("stateQuiz", function (ipc, uid, state){


    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/quiz/state",
        method: "POST",
        headers:{
            "content-type": 'application/json'
        }
    }

    const req = https.request(options, res=>{

    });

    let data = {

        "key": key,
        "uid": uid,
        "state": state

    }

    req.write(JSON.stringify(data));

    req.end();
    console.log(data);

    req.on("response", response => {

        let returnData = "";

        response.on("data", chunk => {

            returnData += chunk;

        })

        response.on("end", () => {

            returnData = JSON.parse(returnData);

            console.log(returnData);

            if(returnData.ResultCode === 1) {
                mainWindows.webContents.send("stateQuizResponse");
            } else {

                console.error(returnData);

            }
        })


    })

})
ipcMain.on("getQuiz", function (event, uid){

    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/quiz?key="+key+"&uid="+uid,
        method: "GET",
        headers:{
            "content-type": 'application/json'
        }
    }

    const req = https.request(options, res=>{

        let returnData = "";

        res.on("data", chunk => {

            returnData += chunk;

        })

        res.on("end", () => {

            returnData = JSON.parse(returnData);

            if(returnData.ResultCode === 1 && returnData.exist) {
                mainWindows.webContents.send("getQuizResponse", returnData.quiz);
            } else {

                console.error(returnData);

            }
        })
    });

    req.end();

})
ipcMain.on("getAllQuestion", function (ipc, ...args) {


    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/question/getAll?key="+key,
        method: "GET",
        headers:{
            "content-type": 'application/json'
        }
    }

    const req = https.request(options, res=>{
        console.log('Status code: '+res.statusCode);

        let data = "";

        res.on('data', chunk => {
            data+=chunk;
        });

        res.on("end", () => {
            mainWindows.webContents.send("getAllQuestionResponse", data);
        })
    })

    req.end();


})
ipcMain.on("getAllQuestionFrom", function (ipc, quiz){

    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/question/from?key="+key,
        method: "GET",
        headers:{
            "content-type": 'application/json'
        }
    }

    let data = {
        uidQuiz: quiz
    }

    const req = https.request(options, res=>{
        console.log('Status code: '+res.statusCode);
    })

    req.write(JSON.stringify(data));

    console.log(data);

    req.end();

    req.on("response", (res)=>{

        let data = "";

        res.on('data', chunk => {
            data+=chunk;
        });

        res.on("end", () => {
            if(JSON.stringify(data).ResultCode === 1) {
                mainWindows.webContents.send("getAllQuestionFromResponse", data);
            } else {
                console.error(data);
            }
        })
    })
})
ipcMain.on("createQuestion", function (ipc, data){


    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/question",
        method: "POST",
        headers:{
            "content-type": 'application/json'
        }
    }

    const req = https.request(options);

    data.UIDAuthor = key;

    console.table(data);

    data = JSON.stringify(data);

    req.write(data);

    req.end();

    req.on("response", ()=>{
        mainWindows.webContents.send("createQuestionResponse", true);
    })


})
ipcMain.on("editQuestion", (ipc, data)=>{

    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/question/change",
        method: "POST",
        headers:{
            "content-type": 'application/json'
        }
    }

    const req = https.request(options);

    data.key = key;

    let dataJSON = JSON.stringify(data);

    req.write(dataJSON);

    req.end()

    req.on("response", ()=>{
        mainWindows.webContents.send("editQuestionResponse");
    })

})
ipcMain.on("deleteQuestion", (ipc, uid)=>{

    let options = {
        hostname: "misterx-94495.herokuapp.com",
        path: "/app/question/remove",
        method: "POST",
        headers:{
            "content-type": 'application/json'
        }
    }

    const req = https.request(options, res=>{

    });

    let data = {

        "key": key,
        "uid": uid,

    }

    req.write(JSON.stringify(data));

    req.end();
    console.log(data);

    req.on("response", response => {

        let returnData = "";

        response.on("data", chunk => {

            returnData += chunk;

        })

        response.on("end", () => {

            returnData = JSON.parse(returnData);

            console.log(returnData);

            if(returnData.ResultCode === 1) {
                mainWindows.webContents.send("deleteQuestionResponse");
            } else {

                console.error(returnData);

            }
        })


    })

})

ipcMain.on("authAccount", (ipc, pseudo, password)=>{

    console.log("authAccount");

    authAccount(pseudo, password);

})

ipcMain.on('app_version', (event) => {
    console.log(app.getVersion());
    mainWindows.webContents.send('app_version', app.getVersion());
});

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});
