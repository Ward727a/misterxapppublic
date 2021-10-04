
function login(){

    let pseudo = document.getElementById("pseudo");
    let password = document.getElementById("password");

    window.api.sendAsync("authAccount", pseudo.value, password.value);

    window.api.receiveOnce("authAccountResponse", (data)=>{

        console.log(data);



    })

}
