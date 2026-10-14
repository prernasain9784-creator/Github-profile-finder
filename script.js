const API_BASE = "https://api.github.com";

const searchForm = document.getElementById("searchForm");
const usernameInput = document.getElementById("username");
const searchButton = document.getElementById("searchButton");
const message = document.getElementById("message");

const profileSection = document.getElementById("profileSection");
const repositoryMessage = document.getElementById("repositoryMessage");
const repositoryList = document.getElementById("repositoryList");

const battleToggle = document.getElementById("battleToggle");
const battlePanel = document.getElementById("battleForm");
const compareForm = document.getElementById("compareForm");
const battleButton = document.getElementById("battleButton");
const battleMessage = document.getElementById("battleMessage");
const battleResults = document.getElementById("battleResults");
const battleCards = document.getElementById("battleCards");
const battleSummary = document.getElementById("battleSummary");

// Validate GitHub username
function validUsername(username) {
    return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return "Not provided";

    return new Date(dateString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Show status messages
function setMessage(element, text, type = "") {
    element.textContent = text;
    element.className = "message";

    if (type) {
        element.classList.add(type);
    }
}

// Fetch GitHub API data
async function fetchJSON(url) {
    let response;

    try {
        response = await fetch(url, {
            headers: {
                Accept: "application/vnd.github+json"
            }
        });
    } catch {
        throw new Error(
            "Network error. Check your internet connection and try again."
        );
    }

    if (response.status === 404) {
        throw new Error("GitHub user not found. Please check the username.");
    }

    if (response.status === 403 || response.status === 429) {
        throw new Error(
            "GitHub API rate limit reached. Wait a minute and try again."
        );
    }

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
}

// Get one user profile
async function getUser(username) {
    return fetchJSON(
        `${API_BASE}/users/${encodeURIComponent(username)}`
    );
}

// Get latest five repositories
async function getRecentRepositories(reposUrl) {
    const url = new URL(reposUrl);

    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("per_page", "5");

    return fetchJSON(url.toString());
}

// Get all public repositories for Battle Mode
async function getAllRepositories(reposUrl) {
    const allRepositories = [];
    let page = 1;

    while (true) {
        const url = new URL(reposUrl);

        url.searchParams.set("sort", "updated");
        url.searchParams.set("per_page", "100");
        url.searchParams.set("page", String(page));

        const repositories = await fetchJSON(url.toString());

        allRepositories.push(...repositories);

        if (repositories.length < 100) {
            break;
        }

        page++;
    }

    return allRepositories;
}

// Clear previous profile results
function clearProfile() {
    profileSection.hidden = true;
    repositoryList.replaceChildren();
    setMessage(repositoryMessage, "");
}

// Display profile information
function displayProfile(user) {
    document.getElementById("avatar").src = user.avatar_url;
    document.getElementById("avatar").alt = `${user.login}'s avatar`;

    document.getElementById("name").textContent =
        user.name || user.login;

    document.getElementById("userName").textContent =
        `@${user.login}`;

    document.getElementById("bio").textContent =
        user.bio || "No bio provided.";

    document.getElementById("joinDate").textContent =
        formatDate(user.created_at);

    document.getElementById("repositories").textContent =
        user.public_repos.toLocaleString();

    document.getElementById("followers").textContent =
        user.followers.toLocaleString();

    document.getElementById("following").textContent =
        user.following.toLocaleString();

    document.getElementById("profileLink").href = user.html_url;

    profileSection.hidden = false;
}

// Display repository cards
function displayRepositories(repositories) {
    repositoryList.replaceChildren();

    if (repositories.length === 0) {
        setMessage(
            repositoryMessage,
            "This user has no public repositories."
        );
        return;
    }

    setMessage(
        repositoryMessage,
        `Showing ${repositories.length} recent repositories.`,
        "success"
    );

    repositories.forEach((repo) => {
        const card = document.createElement("article");
        card.className = "repository-card";

        const link = document.createElement("a");
        link.className = "repository-name";
        link.href = repo.html_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = repo.name;

        const description = document.createElement("p");
        description.className = "repository-description";
        description.textContent =
            repo.description || "No description provided.";

        const info = document.createElement("div");
        info.className = "repository-info";

        const language = document.createElement("span");
        language.textContent =
            `Language: ${repo.language || "Not specified"}`;

        const stars = document.createElement("span");
        stars.textContent =
            `★ ${repo.stargazers_count.toLocaleString()} stars`;

        const updated = document.createElement("span");
        updated.textContent =
            `Updated: ${formatDate(repo.updated_at)}`;

        info.append(language, stars, updated);
        card.append(link, description, info);
        repositoryList.append(card);
    });
}

// Phase 1 and Phase 2: Search profile and repositories
searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();

    if (!validUsername(username)) {
        clearProfile();
        setMessage(
            message,
            "Enter a valid GitHub username using letters, numbers, or hyphens.",
            "error"
        );
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Loading...";
    setMessage(message, "Searching GitHub...");
    clearProfile();

    try {
        const user = await getUser(username);

        displayProfile(user);
        setMessage(message, `Profile found for @${user.login}.`, "success");
        setMessage(repositoryMessage, "Loading repositories...");

        try {
            const repositories = await getRecentRepositories(user.repos_url);
            displayRepositories(repositories);
        } catch (error) {
            setMessage(repositoryMessage, error.message, "error");
        }
    } catch (error) {
        setMessage(message, error.message, "error");
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Search Profile";
    }
});

// Open and close Battle Mode
battleToggle.addEventListener("click", () => {
    const opening = battlePanel.hidden;

    battlePanel.hidden = !opening;
    battleToggle.classList.toggle("active", opening);
    battleToggle.setAttribute("aria-expanded", String(opening));

    if (!opening) {
        battleResults.hidden = true;
        setMessage(battleMessage, "");
    }
});

// Create one Battle Mode card
function createBattleCard(user, stars, resultClass, badge) {
    const card = document.createElement("article");
    card.className = `battle-card ${resultClass}`;

    const avatar = document.createElement("img");
    avatar.src = user.avatar_url;
    avatar.alt = `${user.login}'s avatar`;

    const name = document.createElement("h3");
    name.textContent = user.name || user.login;

    const handle = document.createElement("p");
    handle.className = "muted";
    handle.textContent = `@${user.login}`;

    const score = document.createElement("p");
    score.className = "star-score";
    score.textContent = `★ ${stars.toLocaleString()} total stars`;

    const status = document.createElement("p");
    status.textContent = badge;

    const link = document.createElement("a");
    link.className = "profile-link";
    link.href = user.html_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View Profile";

    card.append(avatar, name, handle, score, status, link);

    return card;
}

// Phase 3: Compare two developers
compareForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName = document.getElementById("usernameOne").value.trim();
    const secondName = document.getElementById("usernameTwo").value.trim();

    if (!validUsername(firstName) || !validUsername(secondName)) {
        setMessage(
            battleMessage,
            "Enter two valid GitHub usernames.",
            "error"
        );
        return;
    }

    if (firstName.toLowerCase() === secondName.toLowerCase()) {
        setMessage(
            battleMessage,
            "Enter two different GitHub usernames.",
            "error"
        );
        return;
    }

    battleButton.disabled = true;
    battleButton.textContent = "Comparing...";
    battleResults.hidden = true;
    battleCards.replaceChildren();

    setMessage(
        battleMessage,
        "Loading profiles and repositories. Large accounts may take longer."
    );

    try {
        const [userOne, userTwo] = await Promise.all([
            getUser(firstName),
            getUser(secondName)
        ]);

        const [reposOne, reposTwo] = await Promise.all([
            getAllRepositories(userOne.repos_url),
            getAllRepositories(userTwo.repos_url)
        ]);

        const starsOne = reposOne.reduce(
            (total, repo) => total + repo.stargazers_count,
            0
        );

        const starsTwo = reposTwo.reduce(
            (total, repo) => total + repo.stargazers_count,
            0
        );

        if (starsOne > starsTwo) {
            battleCards.append(
                createBattleCard(userOne, starsOne, "winner", "🏆 Winner"),
                createBattleCard(userTwo, starsTwo, "loser", "Runner-up")
            );

            battleSummary.textContent =
                `${userOne.login} wins with ${starsOne.toLocaleString()} stars!`;

        } else if (starsTwo > starsOne) {
            battleCards.append(
                createBattleCard(userOne, starsOne, "loser", "Runner-up"),
                createBattleCard(userTwo, starsTwo, "winner", "🏆 Winner")
            );

            battleSummary.textContent =
                `${userTwo.login} wins with ${starsTwo.toLocaleString()} stars!`;

        } else {
            battleCards.append(
                createBattleCard(userOne, starsOne, "tie", "Tie"),
                createBattleCard(userTwo, starsTwo, "tie", "Tie")
            );

            battleSummary.textContent =
                `It's a tie! Both have ${starsOne.toLocaleString()} stars.`;
        }

        battleResults.hidden = false;
        setMessage(battleMessage, "Comparison completed.", "success");

    } catch (error) {
        setMessage(battleMessage, error.message, "error");
    } finally {
        battleButton.disabled = false;
        battleButton.textContent = "Compare Developers";
    }
});