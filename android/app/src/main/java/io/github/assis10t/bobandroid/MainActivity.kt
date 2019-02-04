package io.github.assis10t.bobandroid

import android.support.v7.app.AppCompatActivity
import android.os.Bundle
import android.support.v7.widget.CardView
import android.support.v7.widget.LinearLayoutManager
import android.support.v7.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import io.github.assis10t.bobandroid.pojo.Item
import kotlinx.android.synthetic.main.activity_main.*
import timber.log.Timber

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        container.isRefreshing = true
        container.isEnabled = true

        ServerConnection().connect {
            container.isRefreshing = false
            container.isEnabled = false
        }
        item_list.layoutManager = LinearLayoutManager(this, LinearLayoutManager.VERTICAL, false)
        item_list.adapter = ItemAdapter()

        //TODO: Remove the next 2 lines
//        val adapter = item_list.adapter as ItemAdapter
//        adapter.updateItems(listOf(Item(null, "Apple"), Item(null, "Orange"), Item(null, "Yeet")))

        refreshItems()
    }

    fun refreshItems() {
        ServerConnection().getItems { success, items ->
            if (!success) {
                Timber.e("getItems failed.")
                return@getItems
            }
            Timber.d("GetItems success. Items: ${items?.size}")
            val adapter = item_list.adapter as ItemAdapter
            adapter.updateItems(items!!)
        }
    }

    class ItemAdapter: RecyclerView.Adapter<ItemAdapter.ViewHolder>() {
        var itemList: List<Item> = listOf()
        val selectedItems: MutableList<Item> = mutableListOf()
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.fragment_shop_item, parent, false)
            return ViewHolder(view)
        }

        override fun getItemCount(): Int = itemList.size

        override fun onBindViewHolder(vh: ViewHolder, pos: Int) {
            val item = itemList[pos]
            val context = vh.container.context
            vh.title.text = item.name
//            vh.container.setCardBackgroundColor(
//                if (selectedItems.contains(item))
//                    vh.container.context.getColor(R.color.lightGray)
//                else
//                    vh.container.context.getColor(R.color.white)
//            )
            vh.container.cardElevation =
                    if (selectedItems.contains(item))
                        dp(context, 4f)
                    else
                        dp(context, 1f)
            vh.container.setOnClickListener {
                if (selectedItems.contains(item))
                    selectedItems.remove(item)
                else
                    selectedItems.add(item)
                notifyItemChanged(pos)
            }
        }

        fun updateItems(items: List<Item>) {
            this.itemList = items
            this.selectedItems.clear()
            notifyDataSetChanged()
        }

        class ViewHolder(view: View): RecyclerView.ViewHolder(view) {
            val title: TextView = view.findViewById(R.id.title)
            val quantity: TextView = view.findViewById(R.id.quantity)
            val container: CardView = view.findViewById(R.id.container)
        }
    }
}
