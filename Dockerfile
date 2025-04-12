# 使用官方Nginx镜像作为基础镜像
FROM nginx:alpine

# 复制编辑器文件到Nginx的静态文件目录
COPY . /usr/share/nginx/html

# 配置Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露80端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"] 