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

NginxConf.create_http_conf = function (domain) {
    var file_name = domain + '.conf';

    var conf_content = `server {
        listen 80;
        server_name ${domain}        
        root /data/auto_conf_web/${domain}/;
      
        access_log /data/logs/nginx/${domain}_access.log;
        error_log /data/logs/nginx/${domain}_error.log;
      
      
      add_header Access-Control-Allow-Origin *;
      add_header Access-Control-Allow-Headers X-Requested-With;
      add_header Access-Control-Allow-Methods GET,POST,OPTIONS;
      }
      `
    
    console.log('准备写入nginx conf',conf_content)
    //写入nginx conf文件到nginx_auto_conf_path
    fs.writeFileSync(nginx_auto_conf_path + file_name,conf_content);    

}


NginxConf.restart_nginx = function(){

    console.log('正在重启...nginx')
    return new Promise((reslove,reject)=>{
        exec(restart_nginx_cmd,function(err, stdout, stderr){
            console.log(err,stdout,stderr);
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
 * @param {String} domain 域名
 */
NginxConf.create_new_https_cert = async function(domain){

    
    try{
        fs.mkdirSync(http_web_dir + domain);
    }
    catch(e){
        console.log('文件夹创建失败',http_web_dir + domain)
    }
    

    NginxConf.create_http_conf(domain);

    await NginxConf.restart_nginx();

    var cmd = `acme.sh --issue -d ${domain} --webroot ${http_web_dir+domain}`
    console.log(cmd);
    exec(cmd,function(err,stdout,stderr){
        console.log(err,stdout,stderr);
    })

}




module.exports = NginxConf;