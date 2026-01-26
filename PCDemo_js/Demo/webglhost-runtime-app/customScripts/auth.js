console.log("🚀 [CustomScript] auth.js is loading...");

tj.login = function (obj) {
    console.log("🔑 [CustomScript] tj.login called with:", obj);
    tj.customCommand("loginUnity", {
        success: function(res) {
            console.info("[Host] loginUnity success res", res);
            obj.success(res);
        },
        fail: function(res) {
            console.info("[Host] loginUnity fail res", res);
            let apiRes = {
                errMsg: res.errorMsg,
                errno: res.errorCode
            };
            obj.fail(apiRes);
        },
        complete: function(res) {
            console.info("[Host] loginUnity complete");
            obj.complete(res);
        }
    })
};


