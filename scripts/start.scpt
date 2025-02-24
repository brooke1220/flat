try
    tell application "iTerm"
        set W to create window with default profile
        tell W's current session
            split vertically with default profile
        end tell
        set T to W's current tab
        set ProjectRoot to "$(dirname $(dirname " & (POSIX path of (path to me)) & "))"
        write T's session 1 text "yarn --cwd \"" & ProjectRoot & "/desktop/renderer-app\" start"
        write T's session 2 text "yarn --cwd \"" & ProjectRoot & "/desktop/main-app\" start"
    end tell
on error errMsg
    tell application "Terminal"
        set ProjectRoot to "$(dirname $(dirname " & (POSIX path of (path to me)) & "))"
        do script "yarn --cwd \"" & ProjectRoot & "/desktop/renderer-app\" start"
        do script "yarn --cwd \"" & ProjectRoot & "/desktop/main-app\" start"
    end tell
end try
