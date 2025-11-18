document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
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

            // Determine display text and email value for unregister action
            let displayText = "";
            let emailValue = "";
            if (p && typeof p === "object") {
              displayText = p.name || p.email || JSON.stringify(p);
              emailValue = p.email || displayText;
            } else {
              displayText = String(p);
              emailValue = String(p);
            }

            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = displayText;

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.title = "Remove participant";
            deleteBtn.setAttribute("aria-label", `Remove ${displayText}`);
            deleteBtn.dataset.activity = name;
            deleteBtn.dataset.email = emailValue;
            deleteBtn.innerHTML = "&times;"; // simple × icon

            // Attach handler to unregister this participant
            deleteBtn.addEventListener("click", async (ev) => {
              ev.preventDefault();
              // Confirm before removing
              if (!confirm(`Unregister ${displayText} from ${name}?`)) return;
              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(emailValue)}`,
                  { method: "POST" }
                );
                const result = await resp.json();
                if (resp.ok) {
                  messageDiv.textContent = result.message || "Participant removed";
                  messageDiv.className = "success";
                  messageDiv.classList.remove("hidden");
                  // Refresh activities list to reflect change
                  await fetchActivities();
                } else {
                  messageDiv.textContent = result.detail || "Failed to remove participant";
                  messageDiv.className = "error";
                  messageDiv.classList.remove("hidden");
                }

                // Auto-hide message
                setTimeout(() => messageDiv.classList.add("hidden"), 5000);
              } catch (err) {
                console.error("Error unregistering participant:", err);
                messageDiv.textContent = "Failed to remove participant. Please try again.";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
                setTimeout(() => messageDiv.classList.add("hidden"), 5000);
              }
            });

            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
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
        await fetchActivities();
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
