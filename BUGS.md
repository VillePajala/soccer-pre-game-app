# Bugs Found During Testing

- we shuold prevent creating players wth duplicate names or numbers (or at least prompt user if that is the case)
- Why does some saved game cards have a question mark on them?
-  in game settings, currently the season/rounament cannot be changed or be unselcted.
- Do we need a modal to manage tournaments and seasons?
The timer modal sometimes resets on mobile if you switch apps. Could another techincal soluton be applied to the timer?
- in games stats the palyers are correctly orders by points. We should refine the filter so that players that have not played any games according to that filter will always be below any player that has games
- The default language of the app is Finnish. THis is done with i18 and the app is now full with english texts by default and we need to change that.
- When creating a new game there is a player selction possibilities. This does not work and is not reflected on the app.
- When loggin a goal, the the available players for goals and assists are all possible players when they should only be the ones selcted to that particular game
- the timer modal shows the other score as red and the other on green, the colo coding is from a time where we did not have home / way changin possibility so the score color coding should reflect that the "MY team" is the green. The timer modal obvisoulsy is not aware of which team is the "my team" or howm/away
- Sub interval should be possible to change mid-game
- Important! If goals a re logged with the goal loggin modal to the game and then you add more goals via the timer modal - in some cases the adding of goals from timer modal resets goa events completely. We need to make sure we dont' loose game events!
- If manually editing the game events (goals scorers or ssisters), they are not reflected on the UI in the player discs in the top player bar.
- We should have two views in the start field view that we can toggle. One is for designeing the opening formation and then another for just drawing tactics
- We should add links to game rules on Pallolitto pages
- At some point (not critical yet) we have to add the ability to add your own club logo and change color scchemes.