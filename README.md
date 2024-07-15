# Introduction
- Federated catalogue deployment

##  Index

- [About](#beginner-about)
- [Usage](#zap-usage)
  - [Installation](#electric_plug-installation)
  - [Architecture](#package-commands)


##   About
This project is part of the XFSC Federated Catalogue initiative. It focuses on deploying the Federated Catalogue (FC) service and the demo portal.
For more details, please visit:
https://gitlab.eclipse.org/eclipse/xfsc/cat/fc-service
https://gitlab.eclipse.org/eclipse/xfsc/cat/fc-service/-/wikis/home

##  Usage
- The project is developed using the following tools:

![Spring](https://img.shields.io/badge/Spring_Boot-F2F4F9?style=for-the-badge&logo=spring-boot)![helm](https://img.shields.io/badge/Helm-0F1689?style=for-the-badge&logo=Helm&labelColor=0F1689)![Kubernetes](https://img.shields.io/badge/Kubernetes-3069DE?style=for-the-badge&logo=kubernetes&logoColor=white)![docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)![PostgresSql](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)![azure devops](https://img.shields.io/badge/Azure_DevOps-0078D7?style=for-the-badge&logo=azure-devops&logoColor=white)![Azure](https://img.shields.io/badge/microsoft%20azure-0089D6?style=for-the-badge&logo=microsoft-azure&logoColor=white)






###  Installation
- The project aims to deploy the components into a Kubernetes environment. If you don't have a Kubernetes environment, please use the following script to install K3s and the required tools:

```
$ DOCKER_VERSION='26.1.4'
KUBECTL_VERSION='1.30'
K3D_VERSION='5.6.3'
TERRAFORM_VERSION='1.8.5-1'
HELM_VERSION='3.15.1-1'
CLUSTER_NAME='Dataspace4Health'
   
command_exists() {
    command -v "$@" > /dev/null 2>&1
}
   
install_docker() {
    sudo apt update
    sudo apt install -y curl
     
    bash <(curl -fsSL https://get.docker.com) --version $DOCKER_VERSION
   
    # Install newuidmap & newgidmap binaries
    sudo apt install -y uidmap fuse-overlayfs
   
    # Run Docker as a non-privileged user
    dockerd-rootless-setuptool.sh install
}
 
start_docker() {
    sudo service docker stop
 
    # Revove previous config in case docker has been already started
    rm -rf .docker > /dev/null
    rm -rf .sudo_as_admin_successful > /dev/null
 
    sudo systemctl enable docker.service
    sudo systemctl enable containerd.service
    sudo service docker start
    echo
}
 
install_kubectl() {
    sudo apt update
    sudo apt install -y apt-transport-https ca-certificates curl gnupg
   
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
    sudo chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg # allow unprivileged APT programs to read this keyring
   
    # This overwrites any existing configuration in /etc/apt/sources.list.d/kubernetes.list
    echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v$KUBECTL_VERSION/deb/ /" | sudo tee /etc/apt/sources.list.d/kubernetes.list
    sudo chmod 644 /etc/apt/sources.list.d/kubernetes.list   # helps tools such as command-not-found to work correctly
   
    sudo apt update
    sudo apt install -y kubectl
}
   
install_k3d() {
    curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | TAG=v$K3D_VERSION bash
}
   
install_terraform() {
    sudo apt update && sudo apt install -y gpg lsb-release
    curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   
    sudo apt update
    sudo apt install -y terraform=$TERRAFORM_VERSION
}
  
install_helm() {
    curl -fsSL https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
    sudo apt install apt-transport-https --yes
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
     
    sudo apt update
    sudo apt install helm=$HELM_VERSION
}
 
create_cluser() {
    k3d cluster create Dataspace4Health --servers 1 --agents 2 --api-port 6550 -p "80:80@loadbalancer" -p "9000:30000@loadbalancer"
    # activate trafik dashboard at "http://localhost:9000/dashboard/"
    echo -n "Waiting traefik pod "
    while [ -z $(kubectl -n kube-system get pods --selector "app.kubernetes.io/name=traefik" --output=name) ]
    do
        echo -n .
        sleep 5
    done
    echo
    kubectl expose $(kubectl -n kube-system get pods --selector "app.kubernetes.io/name=traefik" --output=name) -n kube-system --type=NodePort --name kube-dashboard --port 9000
    kubectl patch service kube-dashboard -n kube-system --type='json' --patch='[{"op": "replace", "path": "/spec/ports/0/nodePort", "value":30000}]'
}
   
if ! command_exists docker; then
    install_docker
fi
   
if ! command_exists kubectl; then
    install_kubectl
fi
   
if ! command_exists k3d; then
    install_k3d
fi
   
if ! command_exists terraform; then
    install_terraform
fi
  
if ! command_exists helm; then
    install_helm
fi
 
if ! grep docker <(groups) > /dev/null 2>&1; then
    sudo usermod -aG docker $USER
    # In order to apply the docker group privileges
    # we need to logout and login the current user
    clear
    echo "Logging out. Please press enter and restart this script aftewards ..."
    read
    exec su - $USER
fi
 
if ! sudo service docker status > /dev/null 2>&1; then
    start_docker
fi
 
if ! grep $CLUSTER_NAME <(k3d cluster list) > /dev/null 2>&1; then
    create_cluser
fi

```

The deployment uses a Docker image stored in Azure ACR. To pull the image, ensure you create a secret within your cluster. For development purposes, you can use the following secret:
```
kubectl create secret docker-registry azureacr  \
    --namespace default \
    --docker-server=ds4hregistry.azurecr.io \
    --docker-username=6d284d2b-92e5-4e85-a564-36a4f8354b6e \
    --docker-password=XVS8Q~HSIeSSDSeNwEsaujLJsUdxJVirzUdYJbzo
```

- Run the following command to deploy the FC service:
```
helm dependency build
helm install -f values.yaml fc ./
```
- To ensure the application runs properly, you need to add some configuration to the host file on your working machine. This step is only valid for testing purposes:
```
	172.17.78.159   fc-server
	172.17.78.159   key-server
	172.17.78.159   portal
```
- Make sure to change the IP address to enable the forwarding of the request to your Kubernetes ingress.
###  Architecture
The Following image represent the FC service architecture: 
![Alt text](./resources/fc-service-arch.png "Arch")
