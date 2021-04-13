var NginxConf = {};

//nginx主目录
const nginx_main_path = '/var/opt/gitlab/nginx/etc/'

//nginx CONF目录
const nginx_auto_conf_path = '/data/conf/autoconf/'

//重启nginx的命令
const restart_nginx_cmd = '/opt/gitlab/embedded/sbin/nginx -c /var/opt/gitlab/nginx/etc/nginx.conf -s reload'

const http_web_dir = '/data/auto_conf_web/'


var exec = require('child_process').exec;
var fs = require('fs');



/**
 * 写入https证书
 * @param {*} domain 
 */
NginxConf.write_https_conf = function(domain){
    var file_name = domain + '_https.conf';
    var conf_content = `server{
        listen 443;
        server_name ${domain};
        ssl on;
        ssl_certificate ${domain}.cer;
        ssl_certificate_key ${domain}.key;
        ssl_session_timeout 5m;
        ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE;
        ssl_prefer_server_ciphers on;
    }`

    fs.writeFileSync(nginx_auto_conf_path+file_name,conf_content);    
}

NginxConf.create_http_conf = function (domain) {
    var file_name = domain + '.conf';

    var conf_content = `server {
    listen 80;
    server_name ${domain};
    root /data/auto_conf_web/${domain};

    access_log /data/logs/nginx/${domain}_access.log;
    error_log /data/logs/nginx/${domain}_error.log;


    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Headers X-Requested-With;
    add_header Access-Control-Allow-Methods GET,POST,OPTIONS;
}`

    console.log('准备写入nginx conf', conf_content)
    //写入nginx conf文件到nginx_auto_conf_path
    fs.writeFileSync(nginx_auto_conf_path + file_name, conf_content);

}


NginxConf.restart_nginx = function () {

    console.log('正在重启...nginx')
    return new Promise((reslove, reject) => {
        exec(restart_nginx_cmd, function (err, stdout, stderr) {
            console.log(err, stdout, stderr);
            reslove();
        })
    })
}


NginxConf.install_cert = function (domain) {
    console.log('安装证书并重启nginx...');
    return new Promise((reslove, reject) => {
        var cmd = `acme.sh --installcert -d ${domain} --key-file ${nginx_main_path + domain}.key --fullchain-file ${nginx_main_path + domain}.cer --reloadcmd "${restart_nginx_cmd}"`
        console.log(cmd)
        exec(cmd, function (err, stdout, stderr) {
            console.log(err, stdout, stderr)
            reslove();
        })
    })
}


/**
 * acme命令行申请并验证证书
 * @returns 
 */
NginxConf.acme_cert = function(){
    return new Promise((reslove,reject) => {
        var cmd = `acme.sh --issue -d ${domain} --webroot ${http_web_dir + domain}`
        console.log(cmd);
        exec(cmd, function (err, stdout, stderr) {
            console.log(err, stdout, stderr);
            reslove();
        })
    })
}




/**
 * 申请一个全新的https证书
 * 1.建立域名所需要的的目录
 * 2.建立nginx Conf
 * 3.重启nginx
 * 4.调用acme.sh申请wellknow文件验证模式
 * 5.域名建立完毕
 * 6.写入httpsconf
 * 7.重启nginx
 * 8.自动添加到concrab 自动续签
 * @param {String} domain 域名
 */
NginxConf.create_new_https_cert = async function (domain) {
    try {
        fs.mkdirSync(http_web_dir + domain);
    }
    catch (e) {
        console.log('文件夹创建失败', http_web_dir + domain)
    }

    //配置http的nginx
    NginxConf.create_http_conf(domain);

    //重启nginx
    await NginxConf.restart_nginx();


    //申请cert证书
    await NginxConf.acme_cert();

    //安装证书
    await NginxConf.install_cert();

    //写入https conf
    NginxConf.write_https_conf(domain);

    //重启NGINX
    await NginxConf.restart_nginx();

    //全流程完成
    console.log('all done');

}




module.exports = NginxConf;