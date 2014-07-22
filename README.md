This is an event-based database to store the event from other site. 

RESTful API
Scalable!! 

API: 
make(CREATE)
	create a new table( means a server host)
	table=$table

get (READ)
	table=$table& # no args could load latest 20 record 
	user=$user&
	from=$datefrom # catch all data after the point 

put (UPDATE)
	table=$table&
	user=$user&
	content=$content

cmp ( compare time) 
	table=$table&
	user=$user&
	srcTime=$datefrom

connect (SCALABLE) 
	after connect, it could be multi-write; if synced, it could be multi-read 
	host=$HOST&
	port=$PORT

sync (SCALABLE)
	host=$HOST

valid (SECURITY)
	set valid use ip address
	host=$HOST

