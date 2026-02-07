# Zero manual config or auto-pilote mode

when I start dock I am for to do this:

- eval $(dock docker-env)
- export KUBECONFIG=/Users/jpiraguha/.kube/dock-config


which is obvious as started it for remote docker and kubernetes, to take over my local setting! which the core of that project! felling locally even remotly! It need to feels transpent

After I create - I am remote
After I stop - I go back local
After I start - I am remote
After I destroy - I go back local

and this with out any other configuation

btw:

dock ssh-config             
export DOCKER_HOST=ssh://dock
dock ssh-config --start-master

dock portforward 

should be the default

## How I imagine it to work

0. having en env var AUTO_PILOTE=true by default
1. storing explicite state in the ~/.dock (up, down, absent)
2. storing a script dock.init:
dock ssh-config  
export DOCKER_HOST=ssh://dock
export KUBECONFIG=/Users/jpiraguha/.kube/dock-config
3. in ~/.zshrc having sourcing dock.init base on the state, so each time a start a new shell I have the right context
4. After I create, or start i want the equivalent:
dock ssh-config  
export DOCKER_HOST=ssh://dock
dock ssh-config --start-master
dock portforward -d
5. Before I stop, or destroy i want the equivalent:
dock ssh-config --stop
dock portforward --stop
6. as the connect might be instable or broken I want
dock contection --refesh (stop all and restart all)
dock contection --clean (stop)