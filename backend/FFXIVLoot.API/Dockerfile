# Use .NET 9.0 SDK for building
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution file (from repo root - Docker build context is repo root)
COPY FFXIVLoot.sln ./

# Copy project files for dependency restoration
COPY backend/FFXIVLoot.API/FFXIVLoot.API.csproj ./backend/FFXIVLoot.API/
COPY backend/FFXIVLoot.Application/FFXIVLoot.Application.csproj ./backend/FFXIVLoot.Application/
COPY backend/FFXIVLoot.Domain/FFXIVLoot.Domain.csproj ./backend/FFXIVLoot.Domain/
COPY backend/FFXIVLoot.Infrastructure/FFXIVLoot.Infrastructure.csproj ./backend/FFXIVLoot.Infrastructure/

# Restore dependencies
RUN dotnet restore FFXIVLoot.sln

# Copy all source files
COPY backend/ ./backend/

# Build and publish the API project
WORKDIR /src/backend/FFXIVLoot.API
RUN dotnet publish -c Release -o /app/publish

# Use .NET 9.0 runtime for running
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Switch to root to configure SSH
USER root

# Install OpenSSH server
RUN apt-get update && \
    apt-get install -y openssh-server && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Get the default user from the base image (usually 'app' or 'dotnet')
ARG APP_USER=app
RUN if ! id "$APP_USER" 2>/dev/null; then \
        APP_USER=$(getent passwd | grep -v root | cut -d: -f1 | head -1); \
    fi && \
    # Ensure user has shell access
    usermod -s /bin/bash "$APP_USER" || true && \
    # Create .ssh directory with correct permissions
    mkdir -p /home/"$APP_USER"/.ssh && \
    chmod 0700 /home/"$APP_USER"/.ssh && \
    chown -R "$APP_USER":"$APP_USER" /home/"$APP_USER"/.ssh

# Copy published app
COPY --from=build /app/publish .

# Create data directory for persistent storage
RUN mkdir -p /app/data && chown -R "$APP_USER":"$APP_USER" /app/data

# Switch back to non-root user
USER $APP_USER

# Expose port (Render will provide PORT env var, default to 8080)
EXPOSE 8080

# Set environment to production
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

# Run the app
ENTRYPOINT ["dotnet", "FFXIVLoot.API.dll"]

