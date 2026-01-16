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

# Copy published app
COPY --from=build /app/publish .

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Expose port (Render will provide PORT env var, default to 8080)
EXPOSE 8080

# Set environment to production
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

# Run the app
ENTRYPOINT ["dotnet", "FFXIVLoot.API.dll"]

