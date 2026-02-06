### Port Forwarding Requirements for Local Development

1. When running a container using the following command:

   ```bash
   docker run --name nginx-test -d -p 8080:80 nginx && sleep 5 && curl http://localhost:8080
   ```

   the service should be accessible locally via `http://localhost:8080`.

2. Currently, access is only possible after manually opening an SSH tunnel:

   ```bash
   ssh -N -L 8080:localhost:8080 root@163.172.189.20
   ```

   This manual step is required to forward traffic from the remote server to the local machine.

3. **Manual port forwarding should be automated.** The system must eliminate the need to run the SSH tunnel command manually for each port.

4. A list of all **dedicated ports** used by the environment should be maintained, ideally in an environment variable or configuration file.

5. The system should use `rdev portforward` (or a similar command) to automatically forward all required ports listed in the configuration.

6. The developer should be able to start working locally without needing to configure or run manual SSH port forwarding commands.
