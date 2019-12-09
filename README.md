# redisCache
Its a CRUD application which uses redis database for cache management

#ListUsers
The Navbar has listusers option which shows the details of all the users in the app

#Add users
The navbar also has add user functionality. Here you can create a user by submitting a form.

#Search user
Home page has search user option which can search the user by its id and shows its user details. This option uses cache management. We first look for user details in the cache memory, if we found it there we display it otherwise we query the database for the details and also save this user details in the cache memory with an expiration time.

#User details
Once we search a user which is present in the database , we are shown its details which includes its firstName, lastName, emailID and id. Here we also have the option to delete or update the user

#Update user
When we are shown the user details , we also get the option to update the user details. Here we have to submit a form and submit it which updates user details in the database.

This option uses cache management. To get the user details for the update user form, we first check into redis_cache , if we have the detais in the cache , it is fetched from the redis database. Otherwise we get the details by quering the database.

#Delete user
The user details page also gives us the option of deleting the user from the database.Doing so also deletes the user details from the cache memory to avoid any conflicts.
