document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const raw = await response.json();

      // Normalize activities into an object keyed by name
      let activities = {};
      if (Array.isArray(raw)) {
        raw.forEach((item, idx) => {
          const key = item.name || item.title || `Activity ${idx + 1}`;
          activities[key] = item;
        });
      } else if (raw && typeof raw === "object") {
        activities = raw;
      } else {
        activities = {};
      }

      // Clear loading message and existing content
      activitiesList.innerHTML = "";

      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        // Ensure details is an object and provide defaults
        details = details || {};
        const description = details.description || "No description available.";
        const schedule = details.schedule || "TBD";
        const maxParticipants = Number.isFinite(details.max_participants) ? details.max_participants : 0;
        const participants = Array.isArray(details.participants) ? details.participants : [];

        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = maxParticipants - participants.length;

        // Debug output to help verify participants are present
        console.debug("Rendering activity:", name, "participants:", participants);

        // Build card with DOM APIs to ensure participants section is always present
        const title = document.createElement("h4");
        title.textContent = name;

        const desc = document.createElement("p");
        desc.textContent = description;

        const scheduleP = document.createElement("p");
        scheduleP.innerHTML = `<strong>Schedule:</strong> ${schedule}`;

        const availP = document.createElement("p");
        availP.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = "Participants";

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";

        // Populate participants list safely (always keep the UL and append LIs)
        if (participants.length > 0) {
          participants.forEach((p) => {
            const li = document.createElement("li");
            if (p && typeof p === "object") {
              li.textContent = p.name || p.email || JSON.stringify(p);
            } else {
              li.textContent = String(p);
            }
            participantsList.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.className = "no-participants";
          li.textContent = "No participants yet";
          participantsList.appendChild(li);
        }

        // assemble card
        participantsSection.appendChild(participantsHeading);
        participantsSection.appendChild(participantsList);

        activityCard.appendChild(title);
        activityCard.appendChild(desc);
        activityCard.appendChild(scheduleP);
        activityCard.appendChild(availP);
        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities to show updated participants and availability
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
