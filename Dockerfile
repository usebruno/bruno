FROM ubuntu:22.04

# Update and install SSH server
RUN apt-get update && \
    apt-get install -y openssh-server sudo && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create SSH directory and configure
RUN mkdir /var/run/sshd

# Create a user with sudo privileges
RUN useradd -m -s /bin/bash admin && \
    echo 'admin:password123' | chpasswd && \
    usermod -aG sudo admin

# Configure SSH
RUN echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config && \
    echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config && \
    echo 'PubkeyAuthentication yes' >> /etc/ssh/sshd_config

# Set root password
RUN echo 'root:rootpassword' | chpasswd

# Expose SSH port
EXPOSE 22

# Start SSH service
CMD ["/usr/sbin/sshd", "-D"]