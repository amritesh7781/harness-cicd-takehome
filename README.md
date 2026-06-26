# Harness CI/CD Take-Home — Step-by-Step Guide

**Your details baked in — nothing to look up:**
- Docker Hub username: `amritesh7781`
- Docker Hub image: `amritesh7781/harness-demo-app`
- GitHub username: `amritesh7781`
- GitHub repo: `amritesh7781/harness-cicd-takehome`
- K8s cluster: minikube (local)

---

## What you will build

```
ci-build-pipeline  ──pushes image──►  Docker Hub (amritesh7781/harness-demo-app)
                                              │
                              artifact trigger fires
                                              │
                                              ▼
                          cd-deploy-pipeline  (Canary → Rollout)
                                              │
                                              ▼
                                    minikube (namespace: default)
```

---

## Files in this repo

```
harness-cicd-takehome/
├── app/server.js                          Node.js app (/, /healthz)
├── app/package.json
├── Dockerfile                             build context = repo root
├── k8s/deployment.yaml                    3 replicas, image = <+artifact.image>
├── k8s/service.yaml                       ClusterIP on port 80
└── harness/
    ├── ci-build-pipeline.yaml             Part 1 — CI pipeline YAML
    ├── cd-deploy-pipeline.yaml            Part 2 — CD pipeline YAML
    ├── service.yaml                       Harness Service entity
    ├── environment-and-infrastructure.yaml
    └── cd-trigger-on-new-image.yaml       Part 12 — artifact trigger
```

---

## Part 0 — One-time account and project setup

### 0-A  Sign up for Harness SaaS
1. Go to https://www.harness.io and click **Get Started / Free Trial**.
2. Complete email verification.

### 0-B  Create Org and Project
1. Top-left menu → **Organizations** → **New Organization**.
   - Name: `Harness CICD Org`   Identifier: `harness_cicd_org`
2. Inside the org → **Projects** → **New Project**.
   - Name: `Harness CICD Project`   Identifier: `harness_cicd_project`

### 0-C  Enable CI and CD modules
1. Inside the project → **Project Settings** → **Modules**.
2. Enable **Continuous Integration** and **Continuous Delivery & GitOps**.

### 0-D  Push this repo to GitHub
1. Create a **public** repo on GitHub named `harness-cicd-takehome`
   under your account `amritesh7781`.
2. Push the contents of this folder to the `main` branch:
   ```bash
   cd harness-cicd-takehome
   git init
   git remote add origin https://github.com/amritesh7781/harness-cicd-takehome.git
   git add .
   git commit -m "initial commit"
   git branch -M main
   git push -u origin main
   ```

---

## Part 1 — CI: `ci-build-pipeline`

### Step 1-A  Create a GitHub Personal Access Token (PAT)
1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Give it a name, set expiry, and tick these scopes:
   - `repo` (full repo access)
   - `read:org`
4. Click **Generate token** — copy it immediately.

### Step 1-B  Create a Docker Hub Access Token
1. Log in to https://hub.docker.com.
2. Top-right avatar → **Account Settings** → **Security** → **New Access Token**.
3. Description: `harness-cicd`, Permission: **Read, Write, Delete**.
4. Click **Generate** — copy it immediately.

> The Docker Hub repo `amritesh7781/harness-demo-app` does **not** need to exist
> yet — Docker Hub creates it automatically on the first push.

### Step 1-C  Create a GitHub connector in Harness
1. Inside your project → **Project Settings** → **Connectors** → **New Connector**.
2. Under **Code Repositories** select **GitHub**.
3. Fill in:
   - Name: `github connector`   Identifier: `github_connector`
   - URL type: **Repository**
   - Connection type: **HTTP**
   - GitHub Repository URL: `https://github.com/amritesh7781/harness-cicd-takehome`
4. Authentication → **Username and Token**:
   - Username: `amritesh7781`
   - Personal Access Token: click **+ New Secret** → paste the PAT from Step 1-A.
5. Enable API access → same token.
6. Connectivity mode: **Connect through Harness Platform**.
7. **Test** → **Finish**.

### Step 1-D  Create a Docker Hub connector in Harness
1. **New Connector** → **Artifact Repositories** → **Docker Registry**.
2. Fill in:
   - Name: `dockerhub connector`   Identifier: `dockerhub_connector`
   - Provider Type: **DockerHub**
   - Docker Registry URL: `https://index.docker.io/v2/`
3. Authentication:
   - Username: `amritesh7781`
   - Password: click **+ New Secret** → paste the Docker Hub Access Token from Step 1-B.
4. Connectivity mode: **Connect through Harness Platform**.
5. **Test** → **Finish**.

### Step 1-E  Create `ci-build-pipeline`
1. In the project, click **Continuous Integration** (left sidebar) → **Pipelines**.
2. **Create a Pipeline**.
   - Name: `ci-build-pipeline`   Identifier: `ci_build_pipeline`
   - How do you want to set up your pipeline: **Inline**
3. Click **Create**.
4. In Pipeline Studio, click **YAML** (top-right toggle).
5. Select all existing YAML, delete it, and paste the contents of
   `harness/ci-build-pipeline.yaml` exactly as-is — all identifiers already match.
6. Click **Save**.

### Step 1-F  Run `ci-build-pipeline`
1. Click **Run**.
2. **Git Branch**: type `main`.
3. Click **Run Pipeline**.
4. Watch the **Build and Push to Docker Hub** step complete.

**Capture for deliverables:**
- Screenshot of the green pipeline run summary.
- Expand the **Build and Push** step → copy the logs showing image built and pushed.
- Go to https://hub.docker.com/r/amritesh7781/harness-demo-app/tags →
  screenshot showing the new tag (the pipeline sequence ID) and `latest`.

---

## Part 2 — CD: `cd-deploy-pipeline`

### Step 2-A  Install and start minikube
```bash
# Install minikube if not already installed
# macOS:
brew install minikube

# Linux:
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Start the cluster
minikube start --driver=docker   # or --driver=virtualbox / --driver=hyperv
```

### Step 2-B  Install the Harness Delegate into minikube
The Delegate is a small agent that lets Harness SaaS talk to your local cluster.

1. In Harness → **Project Settings** → **Delegates** → **New Delegate**.
2. Select **Kubernetes**.
3. Name: `minikube-delegate`   Size: **Small**.
4. Click **Continue** — Harness generates a `harness-delegate.yml`.
5. Download that file, then apply it to your cluster:
   ```bash
   kubectl apply -f harness-delegate.yml
   ```
6. Wait ~2 minutes, then refresh the Delegates page until the delegate shows **Connected**.
7. Verify locally:
   ```bash
   kubectl get pods -n harness-delegate
   # Should show: harness-delegate-... Running
   ```

### Step 2-C  Create a Kubernetes connector in Harness
1. **Project Settings** → **Connectors** → **New Connector**.
2. Under **Cloud Providers** select **Kubernetes cluster**.
3. Fill in:
   - Name: `minikube k8s connector`   Identifier: `minikube_k8s_connector`
   - Connection type: **Use the credentials of a specific Harness Delegate**
4. Delegate setup → select the delegate tag for `minikube-delegate`.
5. **Test** → **Finish**.

### Step 2-D  Create the Harness Service
1. **Continuous Delivery & GitOps** (left sidebar) → **Services** → **New Service**.
2. Name: `harness-demo-service`   Identifier: `harness_demo_service`.
3. Click **Save**, then open the YAML editor for the service.
4. Replace all existing YAML with the contents of `harness/service.yaml`.
5. **Save**.

### Step 2-E  Create the Environment and Infrastructure
**Environment:**
1. **Environments** → **New Environment**.
   - Name: `dev`   Identifier: `dev`   Type: **Pre-Production**
2. **Save**.

**Infrastructure:**
1. Inside the `dev` environment → **Infrastructure Definitions** tab → **New Infrastructure**.
   - Name: `dev-minikube`   Identifier: `dev_minikube`
   - Deployment Type: **Kubernetes**
2. Click **Next** → Infrastructure Definition:
   - Type: **Kubernetes (Direct)**
   - Connector: `minikube_k8s_connector`
   - Namespace: `default`
3. **Save**.

### Step 2-F  Create `cd-deploy-pipeline`
1. **Continuous Delivery & GitOps** → **Pipelines** → **Create a Pipeline**.
   - Name: `cd-deploy-pipeline`   Identifier: `cd_deploy_pipeline`
   - Setup: **Inline**
2. Open the **YAML** editor, replace all content with `harness/cd-deploy-pipeline.yaml`.
3. **Save**.

### Step 2-G  Run `cd-deploy-pipeline` manually (first time)
1. Click **Run**.
2. When prompted for the artifact tag, type: `latest`
3. Click **Run Pipeline**.
4. Watch the execution:
   - **Canary Deployment** step → 1 canary pod spins up.
   - **Canary Delete** → canary pod removed.
   - **Rollout Deployment** → all 3 replicas roll out.

**Verify in minikube:**
```bash
kubectl get pods
# NAME                               READY   STATUS    RESTARTS
# harness-demo-app-<hash>-<id>       1/1     Running   0   (×3)

kubectl get svc harness-demo-app-svc
# Confirm ClusterIP exists

# Quick health check
kubectl port-forward svc/harness-demo-app-svc 8080:80 &
curl http://localhost:8080/healthz
# {"status":"ok","version":"v1","pod":"harness-demo-app-..."}
```

**Capture for deliverables:**
- Screenshots of the Canary Deployment step logs and Rollout Deployment step logs.
- `kubectl get pods` output showing 3 Running pods.
- `/healthz` response.

---

## Part 12 — Trigger: CI automatically starts CD

### Step 12-A  Create the artifact trigger on `cd-deploy-pipeline`
> Creating in the UI is more reliable than pasting YAML because the UI
> auto-generates the correct input mapping.

1. Open `cd-deploy-pipeline` → **Triggers** tab → **New Trigger**.
2. Select **Artifact**.
3. **Artifact Type**: Docker Registry → **Continue**.
4. Fill in:
   - Trigger Name: `On New Docker Hub Image`
   - Docker Registry Connector: `dockerhub_connector`
   - Image Path: `amritesh7781/harness-demo-app`
   - Tag: `<+trigger.artifact.build>`
5. **Continue** → Conditions: leave empty → **Continue**.
6. Pipeline Input: the tag field should auto-populate as `<+trigger.artifact.build>`.
7. **Create Trigger**.

### Step 12-B  End-to-end validation
1. Run **`ci-build-pipeline`** (click Run → branch: `main`).
2. Wait for it to complete — it pushes a new tagged image to Docker Hub.
3. Harness detects the new tag (polling interval ~1 min) and automatically fires
   **`cd-deploy-pipeline`**.
4. The CD pipeline execution shows **Triggered by: On New Docker Hub Image** at the top.
5. Watch the full Canary → Rollout flow complete.

---

## Part 3 — Deliverables checklist

| # | Item | How to capture |
|---|------|----------------|
| 1 | `ci-build-pipeline` successful run URL | Copy URL from browser while on the run summary page |
| 2 | Build and Push step logs | Expand step → click Download Logs or screenshot |
| 3 | Image in Docker Hub | https://hub.docker.com/r/amritesh7781/harness-demo-app/tags |
| 4 | `cd-deploy-pipeline` successful run URL | Copy URL from browser (should show "Triggered by" the artifact trigger) |
| 5 | Canary Deployment step logs | Expand step in CD run |
| 6 | Rollout Deployment step logs | Expand step in CD run |
| 7 | `kubectl get pods` showing 3 Running pods | Terminal screenshot |

Share both pipeline execution URLs to demonstrate the combined CI→CD flow.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build and Push fails with auth error | Re-check the Docker Hub Access Token secret; tokens expire. |
| Delegate shows Disconnected | `kubectl get pods -n harness-delegate` — if pod is CrashLooping, check memory. Try `minikube start --memory=4096`. |
| CD fails "manifest not found" | Confirm `k8s/deployment.yaml` and `k8s/service.yaml` exist on the `main` branch. |
| Canary step fails "only one Deployment supported" | The `k8s/` folder must have exactly **one** `kind: Deployment`. |
| Trigger never fires | Docker Hub polling can take up to 2 min. Also confirm the connector test passes. |
| Port-forward shows connection refused | Wait for pods to be Ready: `kubectl wait --for=condition=ready pod -l app=harness-demo-app` |
